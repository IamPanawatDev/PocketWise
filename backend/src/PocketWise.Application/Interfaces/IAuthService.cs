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
}
