using FluentValidation;
using PocketWise.Application.DTOs.Settings;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Features.Settings;

public sealed class UserSettingsService : IUserSettingsService
{
    private readonly IUserSettingsRepository _repository;
    private readonly IValidator<UpdateUserSettingsRequest> _validator;
    private readonly IEmailService? _emailService;
    private readonly IAuditLogService? _auditLogService;

    public UserSettingsService(
        IUserSettingsRepository repository,
        IValidator<UpdateUserSettingsRequest> validator,
        IEmailService? emailService = null,
        IAuditLogService? auditLogService = null)
    {
        _repository = repository;
        _validator = validator;
        _emailService = emailService;
        _auditLogService = auditLogService;
    }

    public async Task<UserSettingsResponse> GetAsync(long userId, CancellationToken cancellationToken = default)
    {
        var settings = await _repository.GetOrCreateAsync(userId, cancellationToken);
        return Map(settings);
    }

    public async Task<UserSettingsResponse> UpdateAsync(
        long userId,
        UpdateUserSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        var settings = await _repository.GetOrCreateAsync(userId, cancellationToken);

        var beforeState = new
        {
            settings.Theme,
            settings.CurrencyCode,
            settings.Locale,
            settings.EmailBudgetAlertsEnabled
        };

        settings.Theme = request.Theme;
        settings.CurrencyCode = request.CurrencyCode;
        settings.Locale = request.Locale;
        settings.EmailBudgetAlertsEnabled = request.EmailBudgetAlertsEnabled;
        settings.UpdatedAt = DateTime.UtcNow;
        await _repository.SaveAsync(settings, cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Update,
                "UserSettings",
                userId.ToString(),
                new
                {
                    Before = beforeState,
                    After = new
                    {
                        request.Theme,
                        request.CurrencyCode,
                        request.Locale,
                        request.EmailBudgetAlertsEnabled
                    }
                },
                cancellationToken);
        }

        return Map(settings);
    }

    public async Task<DataResetResponse> ResetFinancialDataAsync(long userId, CancellationToken cancellationToken = default)
    {
        var resetAt = DateTimeOffset.UtcNow;
        await _repository.ResetFinancialDataAsync(userId, cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Delete,
                "UserData",
                userId.ToString(),
                new
                {
                    Action = "ResetFinancialData",
                    ResetAt = resetAt
                },
                cancellationToken);
        }

        return new DataResetResponse { ResetAt = resetAt };
    }

    private UserSettingsResponse Map(UserSettings settings) => new()
    {
        Theme = settings.Theme,
        CurrencyCode = settings.CurrencyCode,
        Locale = settings.Locale,
        EmailBudgetAlertsEnabled = settings.EmailBudgetAlertsEnabled,
        IsEmailServiceEnabled = _emailService?.IsEnabled ?? true,
        UpdatedAt = settings.UpdatedAt
    };
}
