using FluentValidation;
using PocketWise.Application.DTOs.Budgets;
using PocketWise.Application.Features.Notifications;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Budgets;

public class BudgetService : IBudgetService
{
    private static readonly TimeZoneInfo BangkokTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok");

    private readonly IBudgetRepository _repository;
    private readonly IValidator<CreateBudgetRequest> _createValidator;
    private readonly IValidator<UpdateBudgetRequest> _updateValidator;
    private readonly INotificationSender? _notificationSender;

    public BudgetService(
        IBudgetRepository repository,
        IValidator<CreateBudgetRequest> createValidator,
        IValidator<UpdateBudgetRequest> updateValidator,
        INotificationSender? notificationSender = null)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _notificationSender = notificationSender;
    }

    public async Task<IReadOnlyList<BudgetResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(userId, cancellationToken);
        var currencyCode = await _repository.GetCurrencyCodeAsync(userId, cancellationToken);
        return entities.Select(entity => Map(entity, currencyCode)).ToList();
    }

    public async Task<BudgetResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var currencyCode = await _repository.GetCurrencyCodeAsync(userId, cancellationToken);
        return Map(entity, currencyCode);
    }

    public async Task<IReadOnlyList<BudgetTrackingResponse>> GetTrackingAsync(long userId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(userId, cancellationToken);
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BangkokTimeZone));
        var currencyCode = await _repository.GetCurrencyCodeAsync(userId, cancellationToken);

        var result = new List<BudgetTrackingResponse>();
        var newNotifications = new List<Notification>();
        foreach (var entity in entities.Where(e => e.IsActive))
        {
            var period = BudgetPeriodCalculator.GetCurrentPeriod(entity.PeriodType, entity.StartDate, entity.EndDate, today);
            if (period is null)
            {
                continue;
            }

            var spent = await _repository.GetSpentAmountAsync(
                userId,
                currencyCode,
                entity.ScopeType,
                entity.CategoryId,
                entity.TagId,
                BudgetPeriodCalculator.ToUtcStart(period.Value.From),
                BudgetPeriodCalculator.ToUtcEndExclusive(period.Value.To),
                cancellationToken);

            result.Add(MapTracking(entity, spent, currencyCode));
            await RecordThresholdNotificationAsync(
                userId,
                entity,
                period.Value.From,
                spent,
                currencyCode,
                newNotifications,
                cancellationToken);
            await RecordExceededNotificationAsync(
                userId,
                entity,
                period.Value.From,
                spent,
                currencyCode,
                newNotifications,
                cancellationToken);
        }

        if (newNotifications.Count > 0)
        {
            await _repository.SaveChangesAsync(cancellationToken);

            if (_notificationSender != null)
            {
                foreach (var notification in newNotifications)
                {
                    await _notificationSender.SendNotificationToUserAsync(
                        userId,
                        NotificationService.MapToResponse(notification),
                        cancellationToken);
                }
            }
        }

        return result;
    }

    public async Task<BudgetResponse> CreateAsync(long userId, CreateBudgetRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);
        await ValidateScopeAsync(userId, request.ScopeType, request.CategoryId, request.TagId, cancellationToken);

        var entity = new Budget
        {
            UserId = userId,
            BudgetName = request.BudgetName,
            ScopeType = request.ScopeType,
            CategoryId = request.CategoryId,
            TagId = request.TagId,
            AmountLimit = request.AmountLimit,
            PeriodType = request.PeriodType,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            AlertThresholdPercent = request.AlertThresholdPercent,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        var currencyCode = await _repository.GetCurrencyCodeAsync(userId, cancellationToken);
        return Map(entity, currencyCode);
    }

    public async Task<BudgetResponse?> UpdateAsync(long id, long userId, UpdateBudgetRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        await ValidateScopeAsync(userId, request.ScopeType, request.CategoryId, request.TagId, cancellationToken);

        entity.BudgetName = request.BudgetName;
        entity.ScopeType = request.ScopeType;
        entity.CategoryId = request.CategoryId;
        entity.TagId = request.TagId;
        entity.AmountLimit = request.AmountLimit;
        entity.PeriodType = request.PeriodType;
        entity.StartDate = request.StartDate;
        entity.EndDate = request.EndDate;
        entity.AlertThresholdPercent = request.AlertThresholdPercent;
        entity.IsActive = request.IsActive;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        var currencyCode = await _repository.GetCurrencyCodeAsync(userId, cancellationToken);
        return Map(entity, currencyCode);
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
        return true;
    }

    private async Task ValidateScopeAsync(long userId, BudgetScopeType scopeType, long? categoryId, long? tagId, CancellationToken cancellationToken)
    {
        switch (scopeType)
        {
            case BudgetScopeType.Category:
                if (!categoryId.HasValue)
                {
                    throw new BusinessException("VALIDATION_ERROR", "งบแบบหมวดหมู่ต้องระบุ categoryId");
                }
                if (!await _repository.CategoryExistsAsync(userId, categoryId.Value, cancellationToken))
                {
                    throw new BusinessException("NOT_FOUND", "ไม่พบหมวดหมู่ที่ระบุ");
                }
                break;

            case BudgetScopeType.Tag:
                if (!tagId.HasValue)
                {
                    throw new BusinessException("VALIDATION_ERROR", "งบแบบแท็กต้องระบุ tagId");
                }
                if (!await _repository.TagExistsAsync(userId, tagId.Value, cancellationToken))
                {
                    throw new BusinessException("NOT_FOUND", "ไม่พบแท็กที่ระบุ");
                }
                break;

            case BudgetScopeType.Total:
            default:
                break;
        }
    }

    private static BudgetResponse Map(Budget entity, string currencyCode)
    {
        return new BudgetResponse
        {
            BudgetId = entity.BudgetId,
            BudgetName = entity.BudgetName,
            CurrencyCode = currencyCode,
            ScopeType = entity.ScopeType,
            CategoryId = entity.CategoryId,
            CategoryName = entity.Category?.CategoryName,
            TagId = entity.TagId,
            TagName = entity.Tag?.TagName,
            AmountLimit = entity.AmountLimit,
            PeriodType = entity.PeriodType,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            AlertThresholdPercent = entity.AlertThresholdPercent,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }

    private static BudgetTrackingResponse MapTracking(Budget entity, decimal spent, string currencyCode)
    {
        var remaining = entity.AmountLimit - spent;
        var percentageUsed = entity.AmountLimit <= 0
            ? 0m
            : Math.Round(spent / entity.AmountLimit * 100m, 2);

        return new BudgetTrackingResponse
        {
            BudgetId = entity.BudgetId,
            BudgetName = entity.BudgetName,
            CurrencyCode = currencyCode,
            ScopeType = entity.ScopeType,
            CategoryId = entity.CategoryId,
            CategoryName = entity.Category?.CategoryName,
            TagId = entity.TagId,
            TagName = entity.Tag?.TagName,
            AmountLimit = entity.AmountLimit,
            PeriodType = entity.PeriodType,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            AlertThresholdPercent = entity.AlertThresholdPercent,
            IsActive = entity.IsActive,
            SpentAmount = spent,
            RemainingAmount = remaining,
            PercentageUsed = percentageUsed,
            IsOverLimit = spent > entity.AmountLimit,
            CreatedAt = entity.CreatedAt
        };
    }

    private async Task RecordThresholdNotificationAsync(
        long userId,
        Budget budget,
        DateOnly periodStart,
        decimal spent,
        string currencyCode,
        List<Notification> collectedNotifications,
        CancellationToken cancellationToken)
    {
        var notificationType = $"BUDGET_WARNING_{periodStart:yyyyMMdd}";
        if (spent / budget.AmountLimit * 100m < budget.AlertThresholdPercent
            || await _repository.HasBudgetNotificationAsync(userId, budget.BudgetId, notificationType, cancellationToken))
        {
            return;
        }

        var notification = new Notification
        {
            UserId = userId,
            NotificationType = notificationType,
            Title = $"งบ {budget.BudgetName} ใกล้ถึงขีดจำกัด",
            Message = $"ใช้ไปแล้ว {spent:N2} {currencyCode} จาก {budget.AmountLimit:N2} {currencyCode} ({Math.Round(spent / budget.AmountLimit * 100m, 2):N2}%)",
            Channel = NotificationChannel.InApp,
            Status = NotificationStatus.Sent,
            RelatedEntityType = "Budget",
            RelatedEntityId = budget.BudgetId,
            SentAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddNotificationAsync(notification, cancellationToken);
        collectedNotifications.Add(notification);
    }

    private async Task RecordExceededNotificationAsync(
        long userId,
        Budget budget,
        DateOnly periodStart,
        decimal spent,
        string currencyCode,
        List<Notification> collectedNotifications,
        CancellationToken cancellationToken)
    {
        var notificationType = $"BUDGET_EXCEEDED_{periodStart:yyyyMMdd}";
        if (spent <= budget.AmountLimit
            || await _repository.HasBudgetNotificationAsync(userId, budget.BudgetId, notificationType, cancellationToken))
        {
            return;
        }

        var notification = new Notification
        {
            UserId = userId,
            NotificationType = notificationType,
            Title = $"เกินงบ {budget.BudgetName}",
            Message = $"ใช้ไปแล้ว {spent:N2} {currencyCode} จากงบ {budget.AmountLimit:N2} {currencyCode}",
            Channel = NotificationChannel.InApp,
            Status = NotificationStatus.Sent,
            RelatedEntityType = "Budget",
            RelatedEntityId = budget.BudgetId,
            SentAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddNotificationAsync(notification, cancellationToken);
        collectedNotifications.Add(notification);
    }
}
