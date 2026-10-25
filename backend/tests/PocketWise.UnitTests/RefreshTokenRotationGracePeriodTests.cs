using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using PocketWise.Application.DTOs.Auth;
using PocketWise.Application.Features.Auth;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using System.Security.Claims;
using Xunit;

namespace PocketWise.UnitTests;

public class RefreshTokenRotationGracePeriodTests
{
    private class FakeUserStore : IUserStore<ApplicationUser>
    {
        public void Dispose() { }
        public Task<string> GetUserIdAsync(ApplicationUser user, CancellationToken cancellationToken) => Task.FromResult(user.Id.ToString());
        public Task<string?> GetUserNameAsync(ApplicationUser user, CancellationToken cancellationToken) => Task.FromResult(user.UserName);
        public Task SetUserNameAsync(ApplicationUser user, string? userName, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string?> GetNormalizedUserNameAsync(ApplicationUser user, CancellationToken cancellationToken) => Task.FromResult(user.NormalizedUserName);
        public Task SetNormalizedUserNameAsync(ApplicationUser user, string? normalizedName, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IdentityResult> CreateAsync(ApplicationUser user, CancellationToken cancellationToken) => Task.FromResult(IdentityResult.Success);
        public Task<IdentityResult> UpdateAsync(ApplicationUser user, CancellationToken cancellationToken) => Task.FromResult(IdentityResult.Success);
        public Task<IdentityResult> DeleteAsync(ApplicationUser user, CancellationToken cancellationToken) => Task.FromResult(IdentityResult.Success);
        public Task<ApplicationUser?> FindByIdAsync(string userId, CancellationToken cancellationToken) =>
            Task.FromResult<ApplicationUser?>(new ApplicationUser { Id = long.Parse(userId), IsActive = true, Email = "test@example.com", DisplayName = "Test" });
        public Task<ApplicationUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken) => Task.FromResult<ApplicationUser?>(null);
    }

    private class FakeUserManager : UserManager<ApplicationUser>
    {
        public FakeUserManager() : base(
            new FakeUserStore(),
            Microsoft.Extensions.Options.Options.Create(new IdentityOptions()),
            new PasswordHasher<ApplicationUser>(),
            Array.Empty<IUserValidator<ApplicationUser>>(),
            Array.Empty<IPasswordValidator<ApplicationUser>>(),
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null!,
            new NullLogger<UserManager<ApplicationUser>>())
        {
        }

        public override Task<IList<string>> GetRolesAsync(ApplicationUser user) =>
            Task.FromResult<IList<string>>(new List<string> { "Member" });
    }

    private class FakeRefreshTokenRepository : IUserRefreshTokenRepository
    {
        public List<UserRefreshToken> Tokens { get; } = new();

        public Task<UserRefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
            Task.FromResult(Tokens.FirstOrDefault(t => t.TokenHash == tokenHash));

        public Task<IReadOnlyList<UserRefreshToken>> GetActiveByUserIdAsync(long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<UserRefreshToken>>(Tokens.Where(t => t.UserId == userId && t.ExpiresAt > DateTime.UtcNow && t.RevokedAt == null).ToList());

        public Task AddAsync(UserRefreshToken token, CancellationToken cancellationToken = default)
        {
            Tokens.Add(token);
            return Task.CompletedTask;
        }

        public Task RevokeAsync(UserRefreshToken token, string? revokedByIp = null, string? reason = null, CancellationToken cancellationToken = default)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedByIp = revokedByIp;
            token.ReasonRevoked = !string.IsNullOrWhiteSpace(reason)
                ? Enum.Parse<RevokeReason>(reason, ignoreCase: true)
                : RevokeReason.Logout;
            return Task.CompletedTask;
        }

        public Task RevokeAllForUserAsync(long userId, string? revokedByIp = null, string? reason = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<int> PurgeExpiredTokensAsync(DateTime? cutoffDate = null, CancellationToken cancellationToken = default) => Task.FromResult(0);
        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private class FakeTokenService : ITokenService
    {
        public AuthResponse GenerateTokenPair(ApplicationUser user, IEnumerable<string>? roles = null) =>
            new AuthResponse
            {
                AccessToken = "fresh-access-token",
                AccessTokenExpiresAt = DateTime.UtcNow.AddMinutes(30),
                RefreshToken = "fresh-refresh-token",
                RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7),
                User = new UserProfileResponse { Id = user.Id, Email = user.Email ?? "" }
            };

        public string HashToken(string token) => "hash:" + token;
        public string GenerateRefreshToken() => "fresh-refresh-token";
    }

    [Fact]
    public async Task RefreshAsync_ActiveToken_RotatesSuccessfully()
    {
        var repo = new FakeRefreshTokenRepository();
        repo.Tokens.Add(new UserRefreshToken
        {
            RefreshTokenId = 1,
            UserId = 1,
            TokenHash = "hash:valid-token",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = null
        });

        var service = new AuthService(
            new FakeUserManager(),
            repo,
            new FakeTokenService(),
            null!,
            null!,
            null);

        var result = await service.RefreshAsync(new RefreshRequest { RefreshToken = "valid-token" });

        Assert.NotNull(result);
        Assert.Equal("fresh-access-token", result.AccessToken);
        Assert.NotNull(repo.Tokens[0].RevokedAt);
        Assert.Equal(RevokeReason.Rotated, repo.Tokens[0].ReasonRevoked);
    }

    [Fact]
    public async Task RefreshAsync_RecentlyRotatedTokenWithinGracePeriod_Succeeds()
    {
        var repo = new FakeRefreshTokenRepository();
        repo.Tokens.Add(new UserRefreshToken
        {
            RefreshTokenId = 1,
            UserId = 1,
            TokenHash = "hash:recently-rotated-token",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = DateTime.UtcNow.AddSeconds(-10), // Rotated 10s ago
            ReasonRevoked = RevokeReason.Rotated
        });

        var service = new AuthService(
            new FakeUserManager(),
            repo,
            new FakeTokenService(),
            null!,
            null!,
            null);

        var result = await service.RefreshAsync(new RefreshRequest { RefreshToken = "recently-rotated-token" });

        Assert.NotNull(result);
        Assert.Equal("fresh-access-token", result.AccessToken);
    }

    [Fact]
    public async Task RefreshAsync_RotatedTokenOutsideGracePeriod_ReturnsNull()
    {
        var repo = new FakeRefreshTokenRepository();
        repo.Tokens.Add(new UserRefreshToken
        {
            RefreshTokenId = 1,
            UserId = 1,
            TokenHash = "hash:old-rotated-token",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = DateTime.UtcNow.AddSeconds(-90), // Rotated 90s ago (> 60s)
            ReasonRevoked = RevokeReason.Rotated
        });

        var service = new AuthService(
            new FakeUserManager(),
            repo,
            new FakeTokenService(),
            null!,
            null!,
            null);

        var result = await service.RefreshAsync(new RefreshRequest { RefreshToken = "old-rotated-token" });

        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshAsync_TokenRevokedForLogout_ReturnsNull()
    {
        var repo = new FakeRefreshTokenRepository();
        repo.Tokens.Add(new UserRefreshToken
        {
            RefreshTokenId = 1,
            UserId = 1,
            TokenHash = "hash:logout-token",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = DateTime.UtcNow.AddSeconds(-5),
            ReasonRevoked = RevokeReason.Logout
        });

        var service = new AuthService(
            new FakeUserManager(),
            repo,
            new FakeTokenService(),
            null!,
            null!,
            null);

        var result = await service.RefreshAsync(new RefreshRequest { RefreshToken = "logout-token" });

        Assert.Null(result);
    }
}
