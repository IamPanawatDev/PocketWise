namespace PocketWise.Application.DTOs.AuditLogs;

public class AuditLogResponse
{
    public long AuditLogId { get; set; }
    public long? UserId { get; set; }
    public string? UserDisplayName { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public DateTime OccurredAt { get; set; }
    public string? DetailsJson { get; set; }
}
