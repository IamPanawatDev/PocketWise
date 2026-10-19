using FluentValidation;
using PocketWise.Application.DTOs.Merchants;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Merchants;

public class MerchantService : IMerchantService
{
    private readonly IMerchantRepository _repository;
    private readonly IValidator<CreateMerchantRequest> _createValidator;
    private readonly IValidator<UpdateMerchantRequest> _updateValidator;

    public MerchantService(
        IMerchantRepository repository,
        IValidator<CreateMerchantRequest> createValidator,
        IValidator<UpdateMerchantRequest> updateValidator)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
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

        entity.MerchantName = request.MerchantName.Trim();
        entity.NormalizedName = normalized;
        entity.DefaultCategoryId = request.DefaultCategoryId;
        entity.BankOrProvider = request.BankOrProvider;
        entity.IsVerified = request.IsVerified;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

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
        return true;
    }

    public static string Normalize(string name)
    {
        return (name ?? string.Empty).Trim().ToLowerInvariant();
    }

    private async Task ValidateCategoryAsync(long? categoryId, CancellationToken cancellationToken)
    {
        if (!categoryId.HasValue)
        {
            return;
        }

        if (!await _repository.CategoryExistsAsync(categoryId.Value, cancellationToken))
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบหมวดหมู่ที่ระบุ");
        }
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
