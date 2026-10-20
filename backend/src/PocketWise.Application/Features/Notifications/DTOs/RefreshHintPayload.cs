namespace PocketWise.Application.Features.Notifications.DTOs;

public class RefreshHintPayload
{
    public string EntityType { get; set; } = string.Empty;
    public string Hint { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
