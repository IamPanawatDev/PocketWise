using FluentValidation;
using PocketWise.Application.DTOs.Merchants;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Merchants;

public class MerchantService : IMerchantService
{
    private readonly IMerchantRepository _repository;
    private readonly IValidator<CreateMerchantRequest> _createValidator;
    private readonly IValidator<UpdateMerchantRequest> _updateValidator;
    private readonly IAuditLogService? _auditLogService;

    public MerchantService(
        IMerchantRepository repository,
        IValidator<CreateMerchantRequest> createValidator,
        IValidator<UpdateMerchantRequest> updateValidator,
        IAuditLogService? auditLogService = null)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _auditLogService = auditLogService;
    }

    public async Task<IReadOnlyList<MerchantResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<MerchantResponse?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<MerchantResponse> CreateAsync(CreateMerchantRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);
        await ValidateCategoryAsync(request.DefaultCategoryId, cancellationToken);

        var normalized = Normalize(request.MerchantName);
        var existing = await _repository.SearchByNameAsync(normalized, cancellationToken);
        if (existing.Any(m => m.NormalizedName == normalized))
        {
            throw new BusinessException("CONFLICT", "มีร้านค้าชื่อนี้อยู่แล้ว");
        }

        var entity = new Merchant
        {
            MerchantName = request.MerchantName.Trim(),
            NormalizedName = normalized,
            DefaultCategoryId = request.DefaultCategoryId,
            BankOrProvider = request.BankOrProvider,
            IsVerified = false,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                null,
                AuditAction.Create,
                "Merchants",
                entity.MerchantId.ToString(),
                new
                {
                    entity.MerchantName,
                    entity.NormalizedName,
                    entity.DefaultCategoryId,
                    entity.BankOrProvider
                },
                cancellationToken);
        }

        return Map(entity);
    }

    public async Task<MerchantResponse?> UpdateAsync(long id, UpdateMerchantRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        await ValidateCategoryAsync(request.DefaultCategoryId, cancellationToken);

        var normalized = Normalize(request.MerchantName);
        var matchingMerchants = await _repository.SearchByNameAsync(normalized, cancellationToken);
        if (matchingMerchants.Any(merchant =>
                merchant.MerchantId != id &&
                merchant.NormalizedName.Equals(normalized, StringComparison.OrdinalIgnoreCase)))
        {
            throw new BusinessException("CONFLICT", "มีร้านค้าชื่อนี้อยู่แล้ว");
        }

        var beforeState = new
        {
            entity.MerchantName,
            entity.NormalizedName,
            entity.DefaultCategoryId,
            entity.BankOrProvider,
            entity.IsVerified
        };

        entity.MerchantName = request.MerchantName.Trim();
        entity.NormalizedName = normalized;
        entity.DefaultCategoryId = request.DefaultCategoryId;
        entity.BankOrProvider = request.BankOrProvider;
        entity.IsVerified = request.IsVerified;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                null,
                AuditAction.Update,
                "Merchants",
                id.ToString(),
                new
                {
                    Before = beforeState,
                    After = new
                    {
                        request.MerchantName,
                        request.DefaultCategoryId,
                        request.BankOrProvider,
                        request.IsVerified
                    }
                },
                cancellationToken);
        }

        return Map(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        await _repository.DeleteAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                null,
                AuditAction.Delete,
                "Merchants",
                id.ToString(),
                new
                {
                    entity.MerchantName
                },
                cancellationToken);
        }

        return true;
    }

    private async Task ValidateCategoryAsync(long? categoryId, CancellationToken cancellationToken)
    {
        if (categoryId.HasValue && !await _repository.CategoryExistsAsync(categoryId.Value, cancellationToken))
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบหมวดหมู่ที่ระบุ");
        }
    }

    private static string Normalize(string name)
    {
        return name.Trim().ToLowerInvariant();
    }

    private static MerchantResponse Map(Merchant entity)
    {
        return new MerchantResponse
        {
            MerchantId = entity.MerchantId,
            MerchantName = entity.MerchantName,
            DefaultCategoryId = entity.DefaultCategoryId,
            DefaultCategoryName = entity.DefaultCategory?.CategoryName,
            BankOrProvider = entity.BankOrProvider,
            IsVerified = entity.IsVerified,
            CreatedAt = entity.CreatedAt
        };
    }
}
