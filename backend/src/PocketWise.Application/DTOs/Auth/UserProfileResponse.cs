namespace PocketWise.Application.DTOs.Auth;

public class UserProfileResponse
{
    public long Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
}
