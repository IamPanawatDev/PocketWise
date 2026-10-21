namespace PocketWise.Api.BackgroundServices;

public class MaintenanceJobOptions
{
    public AuditLogCleanupOptions AuditLogCleanup { get; set; } = new();
    public RefreshTokenCleanupOptions RefreshTokenCleanup { get; set; } = new();
}

public class AuditLogCleanupOptions
{
    public bool Enabled { get; set; } = true;
    public int RetentionDays { get; set; } = 90;
    public int RunHour { get; set; } = 2; // 02:00 AM (กลางคืน)
    public int RunMinute { get; set; } = 0;
}

public class RefreshTokenCleanupOptions
{
    public bool Enabled { get; set; } = true;
    public DayOfWeek RunDayOfWeek { get; set; } = DayOfWeek.Sunday; // ทุกคืนวันอาทิตย์
    public int RunHour { get; set; } = 3; // 03:00 AM (คืนวันอาทิตย์)
    public int RunMinute { get; set; } = 0;
}
