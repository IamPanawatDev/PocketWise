namespace PocketWise.Application.DTOs.Admin;

public class SystemSettingResponse
{
    public string SettingKey { get; set; } = string.Empty;
    public string SettingValue { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; }
    public long? UpdatedByUserId { get; set; }
}

public class UpdateSystemSettingRequest
{
    public string Value { get; set; } = string.Empty;
}
