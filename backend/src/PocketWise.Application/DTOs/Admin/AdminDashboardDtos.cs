namespace PocketWise.Application.DTOs.Admin;

public class AdminDashboardOverviewResponse
{
    public int TotalUsers { get; set; }
    public int ActiveUsers30Days { get; set; }
    public int SuspendedUsers { get; set; }
    public int UnverifiedEmailUsers { get; set; }
    public int SignupsToday { get; set; }
    public int SignupsThisWeek { get; set; }
    public int SignupsThisMonth { get; set; }
    public ImportJobsSummaryDto ImportJobsSummary { get; set; } = new();
    public SecurityEventsSummaryDto SecurityEvents24Hours { get; set; } = new();
    public MaintenanceStatusSummaryDto MaintenanceStatus { get; set; } = new();
}

public class ImportJobsSummaryDto
{
    public int Total { get; set; }
    public int Completed { get; set; }
    public int Failed { get; set; }
    public int Processing { get; set; }
    public int Pending { get; set; }
}

public class SecurityEventsSummaryDto
{
    public int Total { get; set; }
    public int FailedLogins { get; set; }
    public int Suspensions { get; set; }
    public int TokenReuses { get; set; }
}

public class MaintenanceStatusSummaryDto
{
    public bool IsEnabled { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
}
