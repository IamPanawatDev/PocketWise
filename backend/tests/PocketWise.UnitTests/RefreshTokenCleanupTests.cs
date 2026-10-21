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

public class RefreshTokenCleanupTests
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
        public Task<ApplicationUser?> FindByIdAsync(string userId, CancellationToken cancellationToken) => Task.FromResult<ApplicationUser?>(null);
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
            return Task.CompletedTask;
        }

        public Task RevokeAllForUserAsync(long userId, string? revokedByIp = null, string? reason = null, CancellationToken cancellationToken = default)
        {
            foreach (var t in Tokens.Where(t => t.UserId == userId))
            {
                t.RevokedAt = DateTime.UtcNow;
            }
            return Task.CompletedTask;
        }

        public Task<int> PurgeExpiredTokensAsync(DateTime? cutoffDate = null, CancellationToken cancellationToken = default)
        {
            var cutoff = cutoffDate ?? DateTime.UtcNow;
            var removed = Tokens.RemoveAll(t => t.ExpiresAt <= cutoff || (t.RevokedAt != null && t.RevokedAt <= cutoff));
            return Task.FromResult(removed);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private class FakeAuditLogService : IAuditLogService
    {
        public List<(string EntityType, string Action, object? Details)> LoggedEvents { get; } = new();

        public Task LogAsync(long? userId, AuditAction action, string entityType, string? entityId, object? details = null, CancellationToken cancellationToken = default)
        {
            LoggedEvents.Add((entityType, action.ToString(), details));
            return Task.CompletedTask;
        }

        public Task<PocketWise.Application.DTOs.PagedResult<PocketWise.Application.DTOs.AuditLogs.AuditLogResponse>> GetLogsPagedAsync(long currentUserId, bool isAdmin, PocketWise.Application.DTOs.AuditLogs.AuditLogFilter filter, int page, int pageSize, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<PocketWise.Application.DTOs.AuditLogs.AuditLogResponse?> GetLogByIdAsync(long id, long currentUserId, bool isAdmin, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<string>> GetEntityTypesAsync(long currentUserId, bool isAdmin, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<PocketWise.Application.DTOs.AuditLogs.AuditLogSettingsResponse> GetSettingsAsync(CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task SetSettingsAsync(bool enabled, long actorUserId, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<PocketWise.Application.DTOs.AuditLogs.PurgeAuditLogsResponse> PurgeLogsAsync(int olderThanDays, long actorUserId, CancellationToken cancellationToken = default) => throw new NotImplementedException();
    }

    private class FakeTokenService : ITokenService
    {
        public AuthResponse GenerateTokenPair(ApplicationUser user, IEnumerable<string>? roles = null) => throw new NotImplementedException();
        public string HashToken(string token) => token;
        public string GenerateRefreshToken() => "dummy";
    }

    private class FakeEmailService : IEmailService
    {
        public bool IsEnabled => true;
        public Task<bool> SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default) => Task.FromResult(true);
    }

    [Fact]
    public async Task PurgeExpiredRefreshTokensAsync_PurgesExpiredAndRevokedTokens()
    {
        // Arrange
        var fakeRepo = new FakeRefreshTokenRepository();
        var fakeAudit = new FakeAuditLogService();

        // 1 active token
        fakeRepo.Tokens.Add(new UserRefreshToken { RefreshTokenId = 1, UserId = 1, ExpiresAt = DateTime.UtcNow.AddDays(10), RevokedAt = null });
        // 1 expired token
        fakeRepo.Tokens.Add(new UserRefreshToken { RefreshTokenId = 2, UserId = 1, ExpiresAt = DateTime.UtcNow.AddDays(-5), RevokedAt = null });
        // 1 revoked token
        fakeRepo.Tokens.Add(new UserRefreshToken { RefreshTokenId = 3, UserId = 2, ExpiresAt = DateTime.UtcNow.AddDays(10), RevokedAt = DateTime.UtcNow.AddDays(-1) });

        var authService = new AuthService(
            new FakeUserManager(),
            fakeRepo,
            new FakeTokenService(),
            null!,
            new FakeEmailService(),
            fakeAudit);

        // Act
        var deletedCount = await authService.PurgeExpiredRefreshTokensAsync();

        // Assert
        Assert.Equal(2, deletedCount);
        Assert.Single(fakeRepo.Tokens);
        Assert.Equal(1, fakeRepo.Tokens[0].RefreshTokenId);
        Assert.Single(fakeAudit.LoggedEvents);
        Assert.Equal("UserRefreshTokens", fakeAudit.LoggedEvents[0].EntityType);
        Assert.Equal("Delete", fakeAudit.LoggedEvents[0].Action);
    }
}
