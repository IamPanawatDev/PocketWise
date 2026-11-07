using FluentValidation;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Transactions;
using PocketWise.Application.Features.Notifications.DTOs;
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
    private readonly INotificationSender? _notificationSender;

    public TransactionService(
        ITransactionRepository repository,
        IValidator<CreateTransactionRequest> createValidator,
        IValidator<UpdateTransactionRequest> updateValidator,
        ICategoryRuleService categoryRuleService,
        IAuditLogService? auditLogService = null,
        INotificationSender? notificationSender = null)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _categoryRuleService = categoryRuleService;
        _auditLogService = auditLogService;
        _notificationSender = notificationSender;
    }

    public async Task<TransactionResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<TransactionPagedResult<TransactionResponse>> GetPagedAsync(long userId, TransactionFilter filter, int page, int pageSize, string sortBy, bool sortDesc, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var result = await _repository.GetPagedAsync(userId, filter, page, pageSize, sortBy, sortDesc, cancellationToken);

        return new TransactionPagedResult<TransactionResponse>(
            result.Items.Select(Map).ToList(),
            result.Page,
            result.PageSize,
            result.TotalItems,
            result.TotalIncome,
            result.TotalExpense
        );
    }

    public async Task<TransactionResponse> CreateAsync(long userId, CreateTransactionRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);

        long? categoryId = request.CategoryId;

        // จัดหมวดอัตโนมัติ (D31): ถ้า user ไม่ได้เลือกหมวด → auto-apply จากกฎ/ร้านค้า
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

        // จัดหมวดอัตโนมัติ (D31): auto-learn เมื่อ user เลือกหมวดเองให้ description (best-effort)
        if (categoryId.HasValue && request.CategoryId.HasValue && !string.IsNullOrWhiteSpace(request.Description))
        {
            try
            {
                await _categoryRuleService.LearnFromManualAsync(userId, request.Description, categoryId.Value, cancellationToken);
            }
            catch
            {
                // Ignore auto-learn errors so primary transaction creation never fails
            }
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
        entity.Category = null;
        entity.BankAccountId = request.BankAccountId;
        entity.BankAccount = null;
        entity.CreditCardId = request.CreditCardId;
        entity.CreditCard = null;
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

        // จัดหมวดอัตโนมัติ (D31): auto-learn เมื่อ user เลือกหมวดเองให้ description (best-effort)
        if (request.CategoryId.HasValue && !string.IsNullOrWhiteSpace(request.Description))
        {
            try
            {
                await _categoryRuleService.LearnFromManualAsync(userId, request.Description, request.CategoryId.Value, cancellationToken);
            }
            catch
            {
                // Ignore auto-learn errors so primary transaction update never fails
            }
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
            return await _repository.ExistsAsync(id, userId, cancellationToken);
        }

        await _repository.SoftDeleteAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            try
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
            catch
            {
                // Graceful fallback: do not fail transaction deletion if audit logging fails
            }
        }

        return true;
    }

    public async Task<int> BulkDeleteAsync(long userId, IReadOnlyList<long> ids, CancellationToken ct = default)
    {
        if (ids == null || ids.Count == 0)
        {
            return 0;
        }

        var distinctIds = ids.Distinct().ToList();
        var transactions = await _repository.GetByIdsAsync(distinctIds, userId, ct);

        if (transactions.Count != distinctIds.Count)
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบรายการธุรกรรมบางรายการ หรือคุณไม่มีสิทธิ์ในการลบ");
        }

        await _repository.SoftDeleteRangeAsync(transactions, ct);
        await _repository.SaveChangesAsync(ct);

        if (_auditLogService != null)
        {
            try
            {
                foreach (var entity in transactions)
                {
                    await _auditLogService.LogAsync(
                        userId,
                        AuditAction.Delete,
                        "Transactions",
                        entity.TransactionId.ToString(),
                        new
                        {
                            entity.TransactionType,
                            entity.Amount,
                            entity.CurrencyCode,
                            entity.TransactionDate,
                            entity.Description,
                            IsDeleted = true,
                            Bulk = true
                        },
                        ct);
                }
            }
            catch
            {
                // Graceful fallback: do not fail bulk transaction deletion if audit logging fails
            }
        }

        if (_notificationSender != null)
        {
            try
            {
                await _notificationSender.SendRefreshHintToUserAsync(
                    userId,
                    new RefreshHintPayload { EntityType = "Transactions", Hint = "bulk-deleted" },
                    ct);
            }
            catch
            {
                // Graceful fallback
            }
        }

        return transactions.Count;
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
            BankAccountName = entity.BankAccount?.AccountName,
            CreditCardId = entity.CreditCardId,
            CreditCardName = entity.CreditCard?.CardName,
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
