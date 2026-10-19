using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class Notification
{
    public long NotificationId { get; set; }
    public long UserId { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationChannel Channel { get; set; }
    public NotificationStatus Status { get; set; }
    public string? RelatedEntityType { get; set; }
    public long? RelatedEntityId { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
