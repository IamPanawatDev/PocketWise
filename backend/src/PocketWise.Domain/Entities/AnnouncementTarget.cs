namespace PocketWise.Domain.Entities;

public class AnnouncementTarget
{
    public long AnnouncementTargetId { get; set; }
    public long AnnouncementId { get; set; }
    public string TargetType { get; set; } = "All"; // All, Role, User, UnverifiedEmail
    public long? RoleId { get; set; }
    public long? UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Announcement Announcement { get; set; } = null!;
    public ApplicationRole? Role { get; set; }
    public ApplicationUser? User { get; set; }
}
