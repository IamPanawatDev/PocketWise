using FluentValidation;
using PocketWise.Application.DTOs.RecurringTransactions;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.RecurringTransactions;

public class RecurringTransactionService : IRecurringTransactionService
{
    private readonly IRecurringTransactionRepository _repository;
    private readonly IValidator<CreateRecurringTransactionRequest> _createValidator;
    private readonly IValidator<UpdateRecurringTransactionRequest> _updateValidator;
    private readonly IAuditLogService? _auditLogService;

    public RecurringTransactionService(
        IRecurringTransactionRepository repository,
        IValidator<CreateRecurringTransactionRequest> createValidator,
        IValidator<UpdateRecurringTransactionRequest> updateValidator,
        IAuditLogService? auditLogService = null)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _auditLogService = auditLogService;
    }

    public async Task<IReadOnlyList<RecurringTransactionResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(userId, cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<RecurringTransactionResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<RecurringTransactionResponse> CreateAsync(long userId, CreateRecurringTransactionRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);
        await ValidateCategoryAsync(userId, request.CategoryId, cancellationToken);

        var entity = new RecurringTransaction
        {
            UserId = userId,
            TransactionType = request.TransactionType,
            Amount = request.Amount,
            Description = request.Description,
            CategoryId = request.CategoryId,
            Frequency = request.Frequency,
            IntervalValue = request.IntervalValue,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            NextRunAt = RecurringSchedule.CalculateNextRunAt(request.StartDate, request.Frequency, request.IntervalValue),
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
                "RecurringTransactions",
                entity.RecurringTransactionId.ToString(),
                new
                {
                    entity.TransactionType,
                    entity.Amount,
                    entity.Description,
                    entity.CategoryId,
                    entity.Frequency,
                    entity.IntervalValue,
                    entity.StartDate,
                    entity.EndDate
                },
                cancellationToken);
        }

        return Map(entity);
    }

    public async Task<RecurringTransactionResponse?> UpdateAsync(long id, long userId, UpdateRecurringTransactionRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        await ValidateCategoryAsync(userId, request.CategoryId, cancellationToken);

        var beforeState = new
        {
            entity.TransactionType,
            entity.Amount,
            entity.Description,
            entity.CategoryId,
            entity.Frequency,
            entity.IntervalValue,
            entity.StartDate,
            entity.EndDate,
            entity.IsActive
        };

        entity.TransactionType = request.TransactionType;
        entity.Amount = request.Amount;
        entity.Description = request.Description;
        entity.CategoryId = request.CategoryId;
        entity.Frequency = request.Frequency;
        entity.IntervalValue = request.IntervalValue;
        entity.StartDate = request.StartDate;
        entity.EndDate = request.EndDate;
        entity.NextRunAt = RecurringSchedule.CalculateNextRunAt(request.StartDate, request.Frequency, request.IntervalValue);
        entity.IsActive = request.IsActive;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Update,
                "RecurringTransactions",
                id.ToString(),
                new
                {
                    Before = beforeState,
                    After = new
                    {
                        request.TransactionType,
                        request.Amount,
                        request.Description,
                        request.CategoryId,
                        request.Frequency,
                        request.IntervalValue,
                        request.StartDate,
                        request.EndDate,
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
                "RecurringTransactions",
                id.ToString(),
                new
                {
                    entity.Description,
                    entity.Amount,
                    IsDeleted = true
                },
                cancellationToken);
        }

        return true;
    }

    public async Task ProcessDueAsync(DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var dueItems = await _repository.GetDueAsync(nowUtc, cancellationToken);

        foreach (var item in dueItems)
        {
            if (!RecurringSchedule.IsWithinRange(item.EndDate, item.NextRunAt))
            {
                item.IsActive = false;
                await _repository.UpdateAsync(item, cancellationToken);
                continue;
            }

            var transaction = new Transaction
            {
                UserId = item.UserId,
                TransactionType = item.TransactionType,
                Amount = item.Amount,
                CurrencyCode = "THB",
                TransactionDate = item.NextRunAt,
                Description = item.Description,
                CategoryId = item.CategoryId,
                SourceType = SourceType.Recurring,
                Status = TransactionStatus.Confirmed,
                RecurringTransactionId = item.RecurringTransactionId,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddTransactionAsync(transaction, cancellationToken);

            item.NextRunAt = RecurringSchedule.Advance(item.NextRunAt, item.Frequency, item.IntervalValue);
            await _repository.UpdateAsync(item, cancellationToken);
        }

        await _repository.SaveChangesAsync(cancellationToken);
    }

    private async Task ValidateCategoryAsync(long userId, long? categoryId, CancellationToken cancellationToken)
    {
        if (!categoryId.HasValue)
        {
            return;
        }

        if (!await _repository.CategoryExistsAsync(userId, categoryId.Value, cancellationToken))
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบหมวดหมู่ที่ระบุ");
        }
    }

    private static RecurringTransactionResponse Map(RecurringTransaction entity)
    {
        return new RecurringTransactionResponse
        {
            RecurringTransactionId = entity.RecurringTransactionId,
            TransactionType = entity.TransactionType,
            Amount = entity.Amount,
            Description = entity.Description,
            CategoryId = entity.CategoryId,
            CategoryName = entity.Category?.CategoryName,
            Frequency = entity.Frequency,
            IntervalValue = entity.IntervalValue,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            NextRunAt = entity.NextRunAt,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }
}
