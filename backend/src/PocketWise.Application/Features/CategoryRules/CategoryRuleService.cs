using FluentValidation;
using PocketWise.Application.DTOs.CategoryRules;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.CategoryRules;

public class CategoryRuleService : ICategoryRuleService
{
    private readonly ICategoryRuleRepository _repository;
    private readonly IMerchantRepository _merchantRepository;
    private readonly IValidator<CreateCategoryRuleRequest> _createValidator;
    private readonly IValidator<UpdateCategoryRuleRequest> _updateValidator;

    public CategoryRuleService(
        ICategoryRuleRepository repository,
        IMerchantRepository merchantRepository,
        IValidator<CreateCategoryRuleRequest> createValidator,
        IValidator<UpdateCategoryRuleRequest> updateValidator)
    {
        _repository = repository;
        _merchantRepository = merchantRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<IReadOnlyList<CategoryRuleResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(userId, cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<CategoryRuleResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<CategoryRuleResponse> CreateAsync(long userId, CreateCategoryRuleRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);

        if (!await _repository.CategoryExistsAsync(userId, request.CategoryId, cancellationToken))
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบหมวดหมู่ที่ระบุ");
        }

        var entity = new CategoryRule
        {
            UserId = userId,
            RuleName = request.RuleName,
            MatchType = request.MatchType,
            MatchPattern = request.MatchPattern,
            CategoryId = request.CategoryId,
            Priority = request.Priority,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<CategoryRuleResponse?> UpdateAsync(long id, long userId, UpdateCategoryRuleRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null || entity.UserId != userId)
        {
            return null;
        }

        if (!await _repository.CategoryExistsAsync(userId, request.CategoryId, cancellationToken))
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบหมวดหมู่ที่ระบุ");
        }

        entity.RuleName = request.RuleName;
        entity.MatchType = request.MatchType;
        entity.MatchPattern = request.MatchPattern;
        entity.CategoryId = request.CategoryId;
        entity.Priority = request.Priority;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null || entity.UserId != userId)
        {
            return false;
        }

        await _repository.DeleteAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<CategorySuggestionResponse?> SuggestCategoryAsync(long userId, string description, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return null;
        }

        // 1) CategoryRules (user + global) โดยเรียงตาม priority (น้อย = ก่อน)
        var rules = await _repository.GetMatchingRulesAsync(userId, description, cancellationToken);
        var rule = rules
            .OrderBy(r => r.Priority)
            .ThenByDescending(r => r.UserId == userId)
            .FirstOrDefault();

        if (rule is not null)
        {
            return new CategorySuggestionResponse
            {
                CategoryId = rule.CategoryId,
                CategoryName = rule.Category?.CategoryName,
                Source = "category-rule"
            };
        }

        // 2) Merchants: จับชื่อร้านค้า (normalized) ที่ปรากฏใน description → DefaultCategoryId
        var merchants = await _merchantRepository.GetAllAsync(cancellationToken);
        foreach (var merchant in merchants
            .Where(merchant => merchant.DefaultCategoryId.HasValue)
            .OrderByDescending(merchant => merchant.NormalizedName.Length))
        {
            if (!string.IsNullOrWhiteSpace(merchant.NormalizedName) &&
                description.Contains(merchant.NormalizedName, StringComparison.OrdinalIgnoreCase) &&
                await _repository.CategoryExistsAsync(userId, merchant.DefaultCategoryId!.Value, cancellationToken))
            {
                return new CategorySuggestionResponse
                {
                    CategoryId = merchant.DefaultCategoryId.Value,
                    CategoryName = merchant.DefaultCategory?.CategoryName,
                    Source = "merchant"
                };
            }
        }

        return null;
    }

    public async Task LearnFromManualAsync(long userId, string description, long categoryId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return;
        }

        var trimmed = description.Trim();

        var existing = await _repository.GetMatchingRulesAsync(userId, trimmed, cancellationToken);
        var exactRule = existing.FirstOrDefault(r =>
            r.UserId == userId &&
            r.MatchType == CategoryMatchType.Description &&
            r.MatchPattern.Equals(trimmed, StringComparison.OrdinalIgnoreCase));
        if (exactRule is not null)
        {
            if (exactRule.RuleName.StartsWith("เรียนรู้: ", StringComparison.Ordinal) &&
                exactRule.CategoryId != categoryId)
            {
                exactRule.CategoryId = categoryId;
                exactRule.UpdatedAt = DateTime.UtcNow;
                await _repository.UpdateAsync(exactRule, cancellationToken);
                await _repository.SaveChangesAsync(cancellationToken);
            }

            return;
        }

        var rule = new CategoryRule
        {
            UserId = userId,
            RuleName = $"เรียนรู้: {trimmed}",
            MatchType = CategoryMatchType.Description,
            MatchPattern = trimmed,
            CategoryId = categoryId,
            Priority = 100,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(rule, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
    }

    private static CategoryRuleResponse Map(CategoryRule entity)
    {
        return new CategoryRuleResponse
        {
            CategoryRuleId = entity.CategoryRuleId,
            RuleName = entity.RuleName,
            MatchType = entity.MatchType,
            MatchPattern = entity.MatchPattern,
            CategoryId = entity.CategoryId,
            CategoryName = entity.Category?.CategoryName,
            Priority = entity.Priority,
            IsActive = entity.IsActive,
            IsGlobal = entity.UserId is null,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };
    }
}
