namespace PocketWise.Application.DTOs.Admin;

public class SecurityEventResponse
{
    public long SecurityEventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public long? TargetUserId { get; set; }
    public string? TargetUserEmail { get; set; }
    public string? TargetUserDisplayName { get; set; }
    public long? ActorUserId { get; set; }
    public string? ActorUserDisplayName { get; set; }
    public bool Succeeded { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? DetailsJson { get; set; }
    public DateTime OccurredAt { get; set; }
}

public class SecurityEventFilterRequest
{
    public string? EventType { get; set; }
    public long? TargetUserId { get; set; }
    public long? ActorUserId { get; set; }
    public bool? Succeeded { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Q { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
