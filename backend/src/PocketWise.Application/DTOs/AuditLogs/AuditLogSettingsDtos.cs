namespace PocketWise.Application.DTOs.AuditLogs;

public sealed class AuditLogSettingsResponse
{
    public bool IsEnabled { get; set; } = true;
    public int TotalLogs { get; set; }
    public DateTime? OldestLogDate { get; set; }
    public DateTime? LatestLogDate { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedByUserId { get; set; }
}

public sealed class UpdateAuditLogSettingsRequest
{
    public bool IsEnabled { get; set; }
}

public sealed class PurgeAuditLogsRequest
{
    public int OlderThanDays { get; set; }
}

public sealed class PurgeAuditLogsResponse
{
    public int DeletedCount { get; set; }
    public string Message { get; set; } = string.Empty;
}
