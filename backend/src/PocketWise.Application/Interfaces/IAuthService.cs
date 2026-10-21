using PocketWise.Application.DTOs.Auth;
using System.Security.Claims;

namespace PocketWise.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default);
    Task<AuthResponse?> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default);
    Task<AuthResponse?> RefreshAsync(RefreshRequest request, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default);
    Task LogoutAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<UserProfileResponse?> MeAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default);
    Task<UserProfileResponse?> UpdateProfileAsync(ClaimsPrincipal user, UpdateUserProfileRequest request, CancellationToken cancellationToken = default);
    Task<SendVerificationEmailResponse> SendVerificationEmailAsync(ClaimsPrincipal user, string? originUrl = null, CancellationToken cancellationToken = default);
    Task<VerifyEmailResponse> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default);
    Task<int> PurgeExpiredRefreshTokensAsync(CancellationToken cancellationToken = default);
    Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request, string? originUrl = null, CancellationToken cancellationToken = default);
    Task<ResetPasswordResponse> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
}
