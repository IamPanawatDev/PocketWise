namespace PocketWise.Domain.Entities;

public class Announcement
{
    public long AnnouncementId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public bool IsActive { get; set; } = true;
    public long CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ApplicationUser CreatedByUser { get; set; } = null!;
    public ICollection<AnnouncementTarget> Targets { get; set; } = [];
}
