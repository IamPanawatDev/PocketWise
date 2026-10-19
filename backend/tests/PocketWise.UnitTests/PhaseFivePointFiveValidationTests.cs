using PocketWise.Application.DTOs.Auth;
using PocketWise.Application.DTOs.Settings;
using PocketWise.Application.Validators;
using PocketWise.Domain.Enums;

namespace PocketWise.UnitTests;

public class PhaseFivePointFiveValidationTests
{
    [Fact]
    public void UpdateUserProfileValidator_AcceptsValidProfile()
    {
        var result = new UpdateUserProfileValidator().Validate(new UpdateUserProfileRequest
        {
            Email = "user@example.com",
            DisplayName = "PocketWise User",
            PhoneNumber = "0812345678",
            BirthDate = new DateOnly(1990, 1, 1)
        });

        Assert.True(result.IsValid);
    }

    [Fact]
    public void UpdateUserProfileValidator_RejectsInvalidEmail()
    {
        var result = new UpdateUserProfileValidator().Validate(new UpdateUserProfileRequest
        {
            Email = "not-an-email",
            DisplayName = "PocketWise User"
        });

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(UpdateUserProfileRequest.Email));
    }

    [Fact]
    public void UpdateUserProfileValidator_RejectsBirthDateInFuture()
    {
        var result = new UpdateUserProfileValidator().Validate(new UpdateUserProfileRequest
        {
            Email = "user@example.com",
            DisplayName = "PocketWise User",
            BirthDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1)
        });

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(UpdateUserProfileRequest.BirthDate));
    }

    [Fact]
    public void UpdateUserSettingsValidator_AcceptsSupportedSettings()
    {
        var result = new UpdateUserSettingsValidator().Validate(new UpdateUserSettingsRequest
        {
            Theme = Theme.Dark,
            CurrencyCode = "THB",
            Locale = "th-TH",
            EmailBudgetAlertsEnabled = true
        });

        Assert.True(result.IsValid);
    }

    [Fact]
    public void UpdateUserSettingsValidator_RejectsMalformedLocale()
    {
        var result = new UpdateUserSettingsValidator().Validate(new UpdateUserSettingsRequest
        {
            Theme = Theme.Light,
            CurrencyCode = "THB",
            Locale = "th-TH-invalid-locale",
            EmailBudgetAlertsEnabled = false
        });

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(UpdateUserSettingsRequest.Locale));
    }
}
