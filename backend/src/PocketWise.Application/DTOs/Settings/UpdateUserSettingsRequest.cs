using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.Settings;

public class UpdateUserSettingsRequest
{
    public Theme Theme { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public string Locale { get; set; } = string.Empty;
    public bool EmailBudgetAlertsEnabled { get; set; }
}
