using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.AuditLogs;

public class AuditLogFilter
{
    public long? UserId { get; set; }
    public AuditAction? Action { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Q { get; set; }
}
