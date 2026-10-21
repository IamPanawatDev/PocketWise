using FluentValidation;
using PocketWise.Application.DTOs.CreditCards;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Features.CreditCards;

public class CreditCardService : ICreditCardService
{
    private readonly ICreditCardRepository _repository;
    private readonly IValidator<CreateCreditCardRequest> _createValidator;
    private readonly IValidator<UpdateCreditCardRequest> _updateValidator;
    private readonly IAuditLogService? _auditLogService;

    public CreditCardService(
        ICreditCardRepository repository,
        IValidator<CreateCreditCardRequest> createValidator,
        IValidator<UpdateCreditCardRequest> updateValidator,
        IAuditLogService? auditLogService = null)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _auditLogService = auditLogService;
    }

    public async Task<IReadOnlyList<CreditCardResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(userId, cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<CreditCardResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<CreditCardResponse> CreateAsync(long userId, CreateCreditCardRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = new CreditCard
        {
            UserId = userId,
            BankName = request.BankName,
            CardName = request.CardName,
            CardNumberMasked = request.CardNumberMasked,
            BillingDay = request.BillingDay,
            PaymentDueDay = request.PaymentDueDay,
            CreditLimit = request.CreditLimit,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Create,
                "CreditCards",
                entity.CreditCardId.ToString(),
                new
                {
                    entity.BankName,
                    entity.CardName,
                    entity.CardNumberMasked,
                    entity.BillingDay,
                    entity.PaymentDueDay,
                    entity.CreditLimit
                },
                cancellationToken);
        }

        return Map(entity);
    }

    public async Task<CreditCardResponse?> UpdateAsync(long id, long userId, UpdateCreditCardRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var beforeState = new
        {
            entity.BankName,
            entity.CardName,
            entity.CardNumberMasked,
            entity.BillingDay,
            entity.PaymentDueDay,
            entity.CreditLimit,
            entity.IsActive
        };

        entity.BankName = request.BankName;
        entity.CardName = request.CardName;
        entity.CardNumberMasked = request.CardNumberMasked;
        entity.BillingDay = request.BillingDay;
        entity.PaymentDueDay = request.PaymentDueDay;
        entity.CreditLimit = request.CreditLimit;
        entity.IsActive = request.IsActive;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Update,
                "CreditCards",
                id.ToString(),
                new
                {
                    Before = beforeState,
                    After = new
                    {
                        request.BankName,
                        request.CardName,
                        request.CardNumberMasked,
                        request.BillingDay,
                        request.PaymentDueDay,
                        request.CreditLimit,
                        request.IsActive
                    }
                },
                cancellationToken);
        }

        return Map(entity);
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
                "CreditCards",
                id.ToString(),
                new
                {
                    entity.CardName,
                    entity.BankName,
                    IsDeleted = true
                },
                cancellationToken);
        }

        return true;
    }

    private static CreditCardResponse Map(CreditCard entity)
    {
        return new CreditCardResponse
        {
            CreditCardId = entity.CreditCardId,
            BankName = entity.BankName,
            CardName = entity.CardName,
            CardNumberMasked = entity.CardNumberMasked,
            BillingDay = entity.BillingDay,
            PaymentDueDay = entity.PaymentDueDay,
            CreditLimit = entity.CreditLimit,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }
}
