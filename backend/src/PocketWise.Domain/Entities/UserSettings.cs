using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class UserSettings
{
    public long UserId { get; set; }
    public Theme Theme { get; set; } = Theme.Light;
    public string CurrencyCode { get; set; } = "THB";
    public string Locale { get; set; } = "th-TH";
    public bool EmailBudgetAlertsEnabled { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
