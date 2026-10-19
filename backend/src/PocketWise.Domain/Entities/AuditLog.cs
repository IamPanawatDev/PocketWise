using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class AuditLog
{
    public long AuditLogId { get; set; }
    public long? UserId { get; set; }
    public AuditAction Action { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string? DetailsJson { get; set; }

    public User? User { get; set; }
}
