using FluentValidation;
using PocketWise.Application.DTOs.BankAccounts;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.BankAccounts;

public class BankAccountService : IBankAccountService
{
    private readonly IBankAccountRepository _repository;
    private readonly IValidator<CreateBankAccountRequest> _createValidator;
    private readonly IValidator<UpdateBankAccountRequest> _updateValidator;

    public BankAccountService(
        IBankAccountRepository repository,
        IValidator<CreateBankAccountRequest> createValidator,
        IValidator<UpdateBankAccountRequest> updateValidator)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<IReadOnlyList<BankAccountResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(userId, cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<BankAccountResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<BankAccountResponse> CreateAsync(long userId, CreateBankAccountRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = new BankAccount
        {
            UserId = userId,
            BankCode = request.BankCode,
            BankName = request.BankName,
            AccountName = request.AccountName,
            AccountNumberMasked = request.AccountNumberMasked,
            AccountType = request.AccountType,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<BankAccountResponse?> UpdateAsync(long id, long userId, UpdateBankAccountRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        entity.BankCode = request.BankCode;
        entity.BankName = request.BankName;
        entity.AccountName = request.AccountName;
        entity.AccountNumberMasked = request.AccountNumberMasked;
        entity.AccountType = request.AccountType;
        entity.IsActive = request.IsActive;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        if (await _repository.HasTransactionsAsync(id, cancellationToken))
        {
            throw new BusinessException("CONFLICT", "ไม่สามารถลบบัญชีที่มีรายการใช้งานอยู่ได้");
        }

        await _repository.SoftDeleteAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static BankAccountResponse Map(BankAccount entity)
    {
        return new BankAccountResponse
        {
            BankAccountId = entity.BankAccountId,
            BankCode = entity.BankCode,
            BankName = entity.BankName,
            AccountName = entity.AccountName,
            AccountNumberMasked = entity.AccountNumberMasked,
            AccountType = entity.AccountType,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }
}
