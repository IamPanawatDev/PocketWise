using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.Settings;

public class UserSettingsResponse
{
    public Theme Theme { get; set; }
    public string CurrencyCode { get; set; } = "THB";
    public string Locale { get; set; } = "th-TH";
    public bool EmailBudgetAlertsEnabled { get; set; }
    public bool IsEmailServiceEnabled { get; set; } = true;
    public DateTime UpdatedAt { get; set; }
}
