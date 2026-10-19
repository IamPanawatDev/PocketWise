using FluentValidation;
using PocketWise.Application.DTOs.Transfers;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Transfers;

public class TransferService : ITransferService
{
    private readonly ITransferRepository _transferRepository;
    private readonly IBankAccountRepository _bankAccountRepository;
    private readonly IValidator<CreateTransferRequest> _validator;

    public TransferService(
        ITransferRepository transferRepository,
        IBankAccountRepository bankAccountRepository,
        IValidator<CreateTransferRequest> validator)
    {
        _transferRepository = transferRepository;
        _bankAccountRepository = bankAccountRepository;
        _validator = validator;
    }

    public async Task<IReadOnlyList<TransferResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        var entities = await _transferRepository.GetAllAsync(userId, cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<TransferResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _transferRepository.GetByIdAsync(id, userId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<TransferResponse> CreateAsync(long userId, CreateTransferRequest request, CancellationToken cancellationToken = default)
    {
        await _validator.ValidateAndThrowAsync(request, cancellationToken);

        var fromAccount = await _bankAccountRepository.GetByIdAsync(request.FromBankAccountId, userId, cancellationToken);
        if (fromAccount is null)
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบบัญชีต้นทาง");
        }

        var toAccount = await _bankAccountRepository.GetByIdAsync(request.ToBankAccountId, userId, cancellationToken);
        if (toAccount is null)
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบบัญชีปลายทาง");
        }

        var transferGroup = new TransferGroup
        {
            UserId = userId,
            FromBankAccountId = request.FromBankAccountId,
            ToBankAccountId = request.ToBankAccountId,
            Amount = request.Amount,
            TransferDate = request.TransferDate,
            Reference = request.Reference,
            Status = TransferGroupStatus.Confirmed,
            CreatedAt = DateTime.UtcNow
        };

        await _transferRepository.AddAsync(transferGroup, cancellationToken);
        await _transferRepository.SaveChangesAsync(cancellationToken);

        // Create two linked transactions: out (from) and in (to)
        var outTransaction = new Transaction
        {
            UserId = userId,
            TransactionType = TransactionType.Transfer,
            Amount = request.Amount,
            CurrencyCode = "THB",
            TransactionDate = request.TransferDate,
            Description = $"โอนออกไปยัง {toAccount.AccountName}",
            BankAccountId = request.FromBankAccountId,
            SourceType = SourceType.Manual,
            Status = TransactionStatus.Confirmed,
            TransferGroupId = transferGroup.TransferGroupId,
            CreatedAt = DateTime.UtcNow
        };

        var inTransaction = new Transaction
        {
            UserId = userId,
            TransactionType = TransactionType.Transfer,
            Amount = request.Amount,
            CurrencyCode = "THB",
            TransactionDate = request.TransferDate,
            Description = $"โอนเข้าจาก {fromAccount.AccountName}",
            BankAccountId = request.ToBankAccountId,
            SourceType = SourceType.Manual,
            Status = TransactionStatus.Confirmed,
            TransferGroupId = transferGroup.TransferGroupId,
            CreatedAt = DateTime.UtcNow
        };

        await _transferRepository.AddTransactionsAsync(new[] { outTransaction, inTransaction }, cancellationToken);
        await _transferRepository.SaveChangesAsync(cancellationToken);

        return Map(transferGroup);
    }

    private static TransferResponse Map(TransferGroup entity)
    {
        return new TransferResponse
        {
            TransferGroupId = entity.TransferGroupId,
            FromBankAccountId = entity.FromBankAccountId,
            ToBankAccountId = entity.ToBankAccountId,
            Amount = entity.Amount,
            TransferDate = entity.TransferDate,
            Reference = entity.Reference,
            Status = entity.Status,
            CreatedAt = entity.CreatedAt
        };
    }
}
