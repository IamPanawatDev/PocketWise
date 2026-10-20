using FluentValidation;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Transactions;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Transactions;

public class TransactionService : ITransactionService
{
    private readonly ITransactionRepository _repository;
    private readonly IValidator<CreateTransactionRequest> _createValidator;
    private readonly IValidator<UpdateTransactionRequest> _updateValidator;
    private readonly ICategoryRuleService _categoryRuleService;
    private readonly IAuditLogService? _auditLogService;

    public TransactionService(
        ITransactionRepository repository,
        IValidator<CreateTransactionRequest> createValidator,
        IValidator<UpdateTransactionRequest> updateValidator,
        ICategoryRuleService categoryRuleService,
        IAuditLogService? auditLogService = null)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _categoryRuleService = categoryRuleService;
        _auditLogService = auditLogService;
    }

    public async Task<TransactionResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<PagedResult<TransactionResponse>> GetPagedAsync(long userId, TransactionFilter filter, int page, int pageSize, string sortBy, bool sortDesc, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var result = await _repository.GetPagedAsync(userId, filter, page, pageSize, sortBy, sortDesc, cancellationToken);

        return new PagedResult<TransactionResponse>
        {
            Items = result.Items.Select(Map).ToList(),
            Page = result.Page,
            PageSize = result.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        };
    }

    public async Task<TransactionResponse> CreateAsync(long userId, CreateTransactionRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);

        long? categoryId = request.CategoryId;

        // จัดหมวดอัตโนมัติ (D33): ถ้า user ไม่ได้เลือกหมวด → auto-apply จากกฎ/ร้านค้า
        if (!categoryId.HasValue && !string.IsNullOrWhiteSpace(request.Description))
        {
            var suggestion = await _categoryRuleService.SuggestCategoryAsync(userId, request.Description, cancellationToken);
            if (suggestion is not null)
            {
                categoryId = suggestion.CategoryId;
            }
        }

        var entity = new Transaction
        {
            UserId = userId,
            TransactionType = request.TransactionType,
            Amount = request.Amount,
            CurrencyCode = request.CurrencyCode,
            TransactionDate = request.TransactionDate,
            Description = request.Description,
            CategoryId = categoryId,
            BankAccountId = request.BankAccountId,
            CreditCardId = request.CreditCardId,
            SourceType = SourceType.Manual,
            Status = TransactionStatus.Confirmed,
            CreatedAt = DateTime.UtcNow
        };

        if (request.TagIds is { Count: > 0 })
        {
            entity.TransactionTags = request.TagIds
                .Select(tagId => new TransactionTag { TagId = tagId })
                .ToList();
        }

        await _repository.AddAsync(entity, cancellationToken);

        // จัดหมวดอัตโนมัติ (D31): auto-learn เมื่อ user เลือกหมวดเองให้ description
        if (categoryId.HasValue && request.CategoryId.HasValue && !string.IsNullOrWhiteSpace(request.Description))
        {
            await _categoryRuleService.LearnFromManualAsync(userId, request.Description, categoryId.Value, cancellationToken);
        }

        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Create,
                "Transactions",
                entity.TransactionId.ToString(),
                new
                {
                    entity.TransactionType,
                    entity.Amount,
                    entity.CurrencyCode,
                    entity.TransactionDate,
                    entity.Description,
                    entity.CategoryId,
                    entity.BankAccountId,
                    entity.CreditCardId,
                    entity.SourceType
                },
                cancellationToken);
        }

        var fresh = await _repository.GetByIdAsync(entity.TransactionId, userId, cancellationToken);
        return Map(fresh ?? entity);
    }

    public async Task<TransactionResponse?> UpdateAsync(long id, long userId, UpdateTransactionRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var beforeState = new
        {
            entity.TransactionType,
            entity.Amount,
            entity.CurrencyCode,
            entity.TransactionDate,
            entity.Description,
            entity.CategoryId,
            entity.BankAccountId,
            entity.CreditCardId
        };

        entity.TransactionType = request.TransactionType;
        entity.Amount = request.Amount;
        entity.CurrencyCode = request.CurrencyCode;
        entity.TransactionDate = request.TransactionDate;
        entity.Description = request.Description;
        entity.CategoryId = request.CategoryId;
        entity.BankAccountId = request.BankAccountId;
        entity.CreditCardId = request.CreditCardId;
        entity.UpdatedAt = DateTime.UtcNow;

        // Replace tags: remove existing and add new ones
        entity.TransactionTags.Clear();
        if (request.TagIds is { Count: > 0 })
        {
            foreach (var tagId in request.TagIds)
            {
                entity.TransactionTags.Add(new TransactionTag { TagId = tagId });
            }
        }

        await _repository.UpdateAsync(entity, cancellationToken);

        // จัดหมวดอัตโนมัติ (D31): auto-learn เมื่อ user เลือกหมวดเองให้ description
        if (request.CategoryId.HasValue && !string.IsNullOrWhiteSpace(request.Description))
        {
            await _categoryRuleService.LearnFromManualAsync(userId, request.Description, request.CategoryId.Value, cancellationToken);
        }

        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Update,
                "Transactions",
                id.ToString(),
                new
                {
                    Before = beforeState,
                    After = new
                    {
                        request.TransactionType,
                        request.Amount,
                        request.CurrencyCode,
                        request.TransactionDate,
                        request.Description,
                        request.CategoryId,
                        request.BankAccountId,
                        request.CreditCardId
                    }
                },
                cancellationToken);
        }

        var fresh = await _repository.GetByIdAsync(id, userId, cancellationToken);
        return Map(fresh ?? entity);
    }

    public async Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        await _repository.SoftDeleteAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Delete,
                "Transactions",
                id.ToString(),
                new
                {
                    entity.TransactionType,
                    entity.Amount,
                    entity.CurrencyCode,
                    entity.TransactionDate,
                    entity.Description,
                    IsDeleted = true
                },
                cancellationToken);
        }

        return true;
    }

    private static TransactionResponse Map(Transaction entity)
    {
        return new TransactionResponse
        {
            TransactionId = entity.TransactionId,
            TransactionType = entity.TransactionType,
            Amount = entity.Amount,
            CurrencyCode = entity.CurrencyCode,
            TransactionDate = entity.TransactionDate,
            Description = entity.Description,
            CategoryId = entity.CategoryId,
            CategoryName = entity.Category?.CategoryName,
            BankAccountId = entity.BankAccountId,
            CreditCardId = entity.CreditCardId,
            SourceType = entity.SourceType,
            TransferGroupId = entity.TransferGroupId,
            RecurringTransactionId = entity.RecurringTransactionId,
            Status = entity.Status,
            Tags = entity.TransactionTags
                .Select(t => new TagRef { TagId = t.TagId, TagName = t.Tag?.TagName ?? string.Empty })
                .ToList(),
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };
    }
}
