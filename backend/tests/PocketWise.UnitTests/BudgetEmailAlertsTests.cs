using FluentValidation;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PocketWise.Application.DTOs.Budgets;
using PocketWise.Application.Features.Budgets;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Services.Email;
using Xunit;

namespace PocketWise.UnitTests;

public class BudgetEmailAlertsTests
{
    private class FakeEmailService : IEmailService
    {
        public bool IsEnabled { get; set; } = true;
        public List<(string To, string Subject, string Body)> SentEmails { get; } = new();
        public bool ReturnResult { get; set; } = true;

        public Task<bool> SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default)
        {
            SentEmails.Add((toEmail, subject, bodyHtml));
            return Task.FromResult(ReturnResult);
        }
    }

    private class FakeBudgetRepository : IBudgetRepository
    {
        public List<Budget> Budgets { get; } = new();
        public List<Notification> Notifications { get; } = new();
        public decimal SpentAmountToReturn { get; set; }
        public string UserEmail { get; set; } = "user@pocketwise.local";
        public bool EmailAlertsEnabled { get; set; } = true;
        public HashSet<string> ExistingNotificationTypes { get; } = new();

        public Task<Budget?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Budgets.FirstOrDefault(b => b.BudgetId == id && b.UserId == userId));

        public Task<IReadOnlyList<Budget>> GetAllAsync(long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Budget>>(Budgets.Where(b => b.UserId == userId).ToList());

        public Task<string> GetCurrencyCodeAsync(long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult("THB");

        public Task<decimal> GetSpentAmountAsync(long userId, string currencyCode, BudgetScopeType scopeType, long? categoryId, long? tagId, DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default) =>
            Task.FromResult(SpentAmountToReturn);

        public Task<bool> HasBudgetNotificationAsync(long userId, long budgetId, string notificationType, CancellationToken cancellationToken = default) =>
            Task.FromResult(ExistingNotificationTypes.Contains(notificationType)
                || Notifications.Any(n => n.UserId == userId && n.RelatedEntityId == budgetId && n.NotificationType == notificationType));

        public Task AddNotificationAsync(Notification notification, CancellationToken cancellationToken = default)
        {
            Notifications.Add(notification);
            return Task.CompletedTask;
        }

        public Task<(string? Email, bool EmailAlertsEnabled)> GetUserEmailAndAlertPreferenceAsync(long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<(string?, bool)>((UserEmail, EmailAlertsEnabled));

        public Task<bool> CategoryExistsAsync(long userId, long categoryId, CancellationToken cancellationToken = default) =>
            Task.FromResult(true);

        public Task<bool> TagExistsAsync(long userId, long tagId, CancellationToken cancellationToken = default) =>
            Task.FromResult(true);

        public Task AddAsync(Budget budget, CancellationToken cancellationToken = default)
        {
            Budgets.Add(budget);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Budget budget, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SoftDeleteAsync(Budget budget, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private class EmptyValidator<T> : InlineValidator<T> { }

    [Fact]
    public async Task GetTrackingAsync_SendsThresholdEmail_WhenSpentCrossesAlertThreshold_AndEmailEnabled()
    {
        // Arrange
        var repo = new FakeBudgetRepository
        {
            UserEmail = "budgetowner@example.com",
            EmailAlertsEnabled = true,
            SpentAmountToReturn = 850m // 85% of 1000 (threshold is 80%)
        };

        repo.Budgets.Add(new Budget
        {
            BudgetId = 1,
            UserId = 10,
            BudgetName = "ค่าอาหาร",
            AmountLimit = 1000m,
            AlertThresholdPercent = 80,
            ScopeType = BudgetScopeType.Total,
            PeriodType = BudgetPeriodType.Monthly,
            StartDate = new DateOnly(2026, 1, 1),
            IsActive = true
        });

        var emailService = new FakeEmailService();
        var service = new BudgetService(
            repo,
            new EmptyValidator<CreateBudgetRequest>(),
            new EmptyValidator<UpdateBudgetRequest>(),
            notificationSender: null,
            emailService: emailService);

        // Act
        var result = await service.GetTrackingAsync(10);

        // Assert
        Assert.Single(result);
        Assert.Single(emailService.SentEmails);
        var sent = emailService.SentEmails[0];
        Assert.Equal("budgetowner@example.com", sent.To);
        Assert.Contains("ใกล้ถึงขีดจำกัดงบ ค่าอาหาร", sent.Subject);
        Assert.Contains("85", sent.Body); // contains 85% or 850

        // Check Notification records: 1 InApp and 1 Email
        var inAppNotification = repo.Notifications.FirstOrDefault(n => n.Channel == NotificationChannel.InApp);
        var emailNotification = repo.Notifications.FirstOrDefault(n => n.Channel == NotificationChannel.Email);

        Assert.NotNull(inAppNotification);
        Assert.NotNull(emailNotification);
        Assert.Equal(NotificationStatus.Sent, emailNotification.Status);
        Assert.Contains("budgetowner@example.com", emailNotification.Message);
    }

    [Fact]
    public async Task GetTrackingAsync_SendsExceededEmail_WhenSpentExceedsLimit_AndEmailEnabled()
    {
        // Arrange
        var repo = new FakeBudgetRepository
        {
            UserEmail = "shopper@example.com",
            EmailAlertsEnabled = true,
            SpentAmountToReturn = 1200m // 1200 of 1000 (120%)
        };

        repo.Budgets.Add(new Budget
        {
            BudgetId = 2,
            UserId = 10,
            BudgetName = "ช้อปปิ้ง",
            AmountLimit = 1000m,
            AlertThresholdPercent = 80,
            ScopeType = BudgetScopeType.Total,
            PeriodType = BudgetPeriodType.Monthly,
            StartDate = new DateOnly(2026, 1, 1),
            IsActive = true
        });

        var emailService = new FakeEmailService();
        var service = new BudgetService(
            repo,
            new EmptyValidator<CreateBudgetRequest>(),
            new EmptyValidator<UpdateBudgetRequest>(),
            notificationSender: null,
            emailService: emailService);

        // Act
        await service.GetTrackingAsync(10);

        // Assert: Both warning and exceeded emails are sent when crossing from 0 directly to exceeded
        Assert.Contains(emailService.SentEmails, e => e.Subject.Contains("เกินขีดจำกัดงบประมาณ ช้อปปิ้ง"));
        var emailExceededNotification = repo.Notifications.FirstOrDefault(n =>
            n.Channel == NotificationChannel.Email && n.NotificationType.StartsWith("BUDGET_EXCEEDED_EMAIL_"));

        Assert.NotNull(emailExceededNotification);
        Assert.Equal(NotificationStatus.Sent, emailExceededNotification.Status);
    }

    [Fact]
    public async Task GetTrackingAsync_DoesNotSendEmail_WhenEmailAlertsDisabled()
    {
        // Arrange
        var repo = new FakeBudgetRepository
        {
            UserEmail = "optout@example.com",
            EmailAlertsEnabled = false, // User disabled email alerts in settings
            SpentAmountToReturn = 900m
        };

        repo.Budgets.Add(new Budget
        {
            BudgetId = 3,
            UserId = 10,
            BudgetName = "ค่าเดินทาง",
            AmountLimit = 1000m,
            AlertThresholdPercent = 80,
            ScopeType = BudgetScopeType.Total,
            PeriodType = BudgetPeriodType.Monthly,
            StartDate = new DateOnly(2026, 1, 1),
            IsActive = true
        });

        var emailService = new FakeEmailService();
        var service = new BudgetService(
            repo,
            new EmptyValidator<CreateBudgetRequest>(),
            new EmptyValidator<UpdateBudgetRequest>(),
            notificationSender: null,
            emailService: emailService);

        // Act
        await service.GetTrackingAsync(10);

        // Assert
        Assert.Empty(emailService.SentEmails);
        Assert.DoesNotContain(repo.Notifications, n => n.Channel == NotificationChannel.Email);
        // But In-App notification should still be generated
        Assert.Contains(repo.Notifications, n => n.Channel == NotificationChannel.InApp);
    }

    [Fact]
    public async Task GetTrackingAsync_PreventsDuplicateEmail_InSamePeriod()
    {
        // Arrange
        var repo = new FakeBudgetRepository
        {
            UserEmail = "test@example.com",
            EmailAlertsEnabled = true,
            SpentAmountToReturn = 850m
        };

        var budget = new Budget
        {
            BudgetId = 4,
            UserId = 10,
            BudgetName = "ค่าห้อง",
            AmountLimit = 1000m,
            AlertThresholdPercent = 80,
            ScopeType = BudgetScopeType.Total,
            PeriodType = BudgetPeriodType.Monthly,
            StartDate = new DateOnly(2026, 1, 1),
            IsActive = true
        };
        repo.Budgets.Add(budget);

        var emailService = new FakeEmailService();
        var service = new BudgetService(
            repo,
            new EmptyValidator<CreateBudgetRequest>(),
            new EmptyValidator<UpdateBudgetRequest>(),
            notificationSender: null,
            emailService: emailService);

        // Act 1: first check sends email
        await service.GetTrackingAsync(10);
        Assert.Single(emailService.SentEmails);

        // Act 2: second check within same cycle shouldn't send another email
        await service.GetTrackingAsync(10);
        Assert.Single(emailService.SentEmails);
    }

    [Fact]
    public async Task SmtpEmailService_DevMode_LogsAndReturnsTrue_WhenHostNotConfigured()
    {
        // Arrange
        var options = Options.Create(new SmtpSettings
        {
            Host = "", // Not configured
            FromEmail = "noreply@pocketwise.local"
        });
        var logger = NullLogger<SmtpEmailService>.Instance;
        var service = new SmtpEmailService(options, logger);

        // Act
        var result = await service.SendEmailAsync("recipient@test.com", "Test Subject", "<p>Hello</p>");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task SmtpEmailService_ReturnsFalse_WhenGloballyDisabled()
    {
        // Arrange
        var options = Options.Create(new SmtpSettings
        {
            Enabled = false,
            Host = "smtp.example.com",
            FromEmail = "noreply@pocketwise.local"
        });
        var logger = NullLogger<SmtpEmailService>.Instance;
        var service = new SmtpEmailService(options, logger);

        // Act
        var result = await service.SendEmailAsync("recipient@test.com", "Test Subject", "<p>Hello</p>");

        // Assert
        Assert.False(result);
    }
}
