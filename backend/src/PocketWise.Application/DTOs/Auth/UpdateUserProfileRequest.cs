namespace PocketWise.Application.DTOs.Auth;

public class UpdateUserProfileRequest
{
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateOnly? BirthDate { get; set; }
}
