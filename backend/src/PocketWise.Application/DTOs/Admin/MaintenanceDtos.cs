namespace PocketWise.Application.DTOs.Admin;

public class MaintenanceStatusResponse
{
    public bool IsEnabled { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<long> AllowedUserIds { get; set; } = [];
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
}

public class UpdateMaintenanceRequest
{
    public bool IsEnabled { get; set; }
    public string? Message { get; set; }
    public List<long>? AllowedUserIds { get; set; }
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
}
