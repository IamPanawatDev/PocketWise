using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PocketWise.Application.DTOs.Auth;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace PocketWise.Api.Authentication;

public class JwtTokenService : ITokenService
{
    private readonly JwtSettings _settings;
    private readonly PocketWiseDbContext? _dbContext;

    public JwtTokenService(IOptions<JwtSettings> options, PocketWiseDbContext? dbContext = null)
    {
        _settings = options.Value;
        _dbContext = dbContext;
    }

    public AuthResponse GenerateTokenPair(ApplicationUser user, IEnumerable<string>? roles = null)
    {
        var roleList = roles?.ToList() ?? new List<string>();
        var accessMinutes = _settings.AccessTokenExpirationMinutes;
        var refreshDays = _settings.RefreshTokenExpirationDays;

        if (_dbContext != null)
        {
            try
            {
                var accessSetting = _dbContext.SystemSettings
                    .AsNoTracking()
                    .FirstOrDefault(s => s.SettingKey == "Jwt:AccessTokenExpirationMinutes");
                if (accessSetting != null && int.TryParse(accessSetting.SettingValue, out var m) && m > 0)
                {
                    accessMinutes = m;
                }

                var refreshSetting = _dbContext.SystemSettings
                    .AsNoTracking()
                    .FirstOrDefault(s => s.SettingKey == "Jwt:RefreshTokenExpirationDays");
                if (refreshSetting != null && int.TryParse(refreshSetting.SettingValue, out var d) && d > 0)
                {
                    refreshDays = d;
                }
            }
            catch
            {
                // Fallback to configuration
            }
        }

        var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(accessMinutes);
        var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshDays);

        var accessToken = GenerateAccessToken(user, roleList, accessTokenExpiresAt);
        var refreshToken = GenerateRefreshToken();

        return new AuthResponse
        {
            AccessToken = accessToken,
            AccessTokenExpiresAt = accessTokenExpiresAt,
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = refreshTokenExpiresAt,
            User = new UserProfileResponse
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                DisplayName = user.DisplayName,
                IsEmailVerified = user.IsEmailVerified,
                Roles = roleList
            }
        };
    }

    public string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    private string GenerateAccessToken(ApplicationUser user, IEnumerable<string> roles, DateTime expiresAt)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Name, user.DisplayName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
