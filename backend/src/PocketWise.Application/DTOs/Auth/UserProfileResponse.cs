namespace PocketWise.Application.DTOs.Auth;

public class UserProfileResponse
{
    public long Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateOnly? BirthDate { get; set; }
    public bool IsEmailVerified { get; set; }
    public List<string> Roles { get; set; } = [];
}
