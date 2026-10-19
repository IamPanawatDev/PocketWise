using Microsoft.AspNetCore.Identity;
using FluentValidation;
using PocketWise.Application.DTOs.Auth;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using System.Security.Claims;

namespace PocketWise.Application.Features.Auth;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IUserRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenService _tokenService;
    private readonly IValidator<UpdateUserProfileRequest> _profileValidator;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IUserRefreshTokenRepository refreshTokenRepository,
        ITokenService tokenService,
        IValidator<UpdateUserProfileRequest> profileValidator)
    {
        _userManager = userManager;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _profileValidator = profileValidator;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            throw new AuthException("CONFlict", "อีเมลนี้ถูกใช้งานแล้ว");
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName,
            UserSettings = new UserSettings(),
            CreatedAt = DateTime.UtcNow,
            LockoutEnabled = false
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new AuthException("VALIDATION_ERROR", errors);
        }

        return await GenerateTokenPairAndSaveAsync(user, ipAddress, userAgent, cancellationToken);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            return null;
        }

        return await GenerateTokenPairAndSaveAsync(user, ipAddress, userAgent, cancellationToken);
    }

    public async Task<AuthResponse?> RefreshAsync(RefreshRequest request, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default)
    {
        var tokenHash = _tokenService.HashToken(request.RefreshToken);
        var storedToken = await _refreshTokenRepository.GetByHashAsync(tokenHash, cancellationToken);

        if (storedToken is null || storedToken.ExpiresAt <= DateTime.UtcNow || storedToken.RevokedAt is not null)
        {
            return null;
        }

        var user = await _userManager.FindByIdAsync(storedToken.UserId.ToString());
        if (user is null || !user.IsActive)
        {
            return null;
        }

        // Token rotation: revoke old token
        await _refreshTokenRepository.RevokeAsync(storedToken, ipAddress, RevokeReason.Rotated.ToString(), cancellationToken);

        var response = await GenerateTokenPairAndSaveAsync(user, ipAddress, userAgent, cancellationToken);

        // Record ReplacedByTokenHash on the old token after generating new pair
        var newRefreshTokenHash = _tokenService.HashToken(response.RefreshToken);
        storedToken.ReplacedByTokenHash = newRefreshTokenHash;
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);

        return response;
    }

    public async Task LogoutAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default)
    {
        var userIdValue = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdValue is null || !long.TryParse(userIdValue, out var userId))
        {
            return;
        }

        // Revoke only the current session's refresh token if we had a way to identify it.
        // For simplicity in v1, revoke all active tokens for the user on logout.
        await _refreshTokenRepository.RevokeAllForUserAsync(userId, null, RevokeReason.Logout.ToString(), cancellationToken);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserProfileResponse?> MeAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default)
    {
        var userIdValue = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdValue is null || !long.TryParse(userIdValue, out var userId))
        {
            return null;
        }

        var applicationUser = await _userManager.FindByIdAsync(userIdValue);
        if (applicationUser is null || !applicationUser.IsActive)
        {
            return null;
        }

        return MapToProfile(applicationUser);
    }

    public async Task<UserProfileResponse?> UpdateProfileAsync(
        ClaimsPrincipal principal,
        UpdateUserProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        await _profileValidator.ValidateAndThrowAsync(request, cancellationToken);
        var userIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdValue is null || !long.TryParse(userIdValue, out _))
        {
            return null;
        }

        var applicationUser = await _userManager.FindByIdAsync(userIdValue);
        if (applicationUser is null || !applicationUser.IsActive)
        {
            return null;
        }

        var nextEmail = request.Email.Trim();
        var emailChanged = !string.Equals(applicationUser.Email, nextEmail, StringComparison.OrdinalIgnoreCase);
        if (emailChanged)
        {
            var existingUser = await _userManager.FindByEmailAsync(nextEmail);
            if (existingUser is not null && existingUser.Id != applicationUser.Id)
            {
                throw new AuthException("CONFLICT", "อีเมลนี้ถูกใช้งานแล้ว");
            }
        }

        applicationUser.Email = nextEmail;
        applicationUser.UserName = nextEmail;
        applicationUser.DisplayName = request.DisplayName.Trim();
        applicationUser.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber)
            ? null
            : request.PhoneNumber.Trim();
        applicationUser.BirthDate = request.BirthDate;
        if (emailChanged)
        {
            applicationUser.IsEmailVerified = false;
        }

        applicationUser.UpdatedAt = DateTime.UtcNow;
        var result = await _userManager.UpdateAsync(applicationUser);
        if (!result.Succeeded)
        {
            var isDuplicate = result.Errors.Any(error =>
                error.Code.Contains("Duplicate", StringComparison.OrdinalIgnoreCase));
            var code = isDuplicate ? "CONFLICT" : "VALIDATION_ERROR";
            throw new AuthException(code, string.Join("; ", result.Errors.Select(error => error.Description)));
        }

        return MapToProfile(applicationUser);
    }

    private async Task<AuthResponse> GenerateTokenPairAndSaveAsync(ApplicationUser user, string? ipAddress, string? userAgent, CancellationToken cancellationToken)
    {
        var response = _tokenService.GenerateTokenPair(user);

        var refreshTokenHash = _tokenService.HashToken(response.RefreshToken);
        var refreshToken = new UserRefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAt = response.RefreshTokenExpiresAt,
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = ipAddress,
            UserAgent = userAgent
        };

        await _refreshTokenRepository.AddAsync(refreshToken, cancellationToken);
        await _refreshTokenRepository.SaveChangesAsync(cancellationToken);

        return response;
    }

    private static UserProfileResponse MapToProfile(ApplicationUser user)
    {
        return new UserProfileResponse
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName,
            PhoneNumber = user.PhoneNumber,
            BirthDate = user.BirthDate,
            IsEmailVerified = user.IsEmailVerified
        };
    }
}

public class AuthException : Exception
{
    public AuthException(string code, string message)
        : base(message)
    {
        Code = code;
    }

    public string Code { get; }
}
