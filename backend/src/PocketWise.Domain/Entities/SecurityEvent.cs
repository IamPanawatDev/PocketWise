namespace PocketWise.Domain.Entities;

public class SecurityEvent
{
    public long SecurityEventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public long? TargetUserId { get; set; }
    public long? ActorUserId { get; set; }
    public bool Succeeded { get; set; } = true;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? DetailsJson { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? TargetUser { get; set; }
    public ApplicationUser? ActorUser { get; set; }
}
