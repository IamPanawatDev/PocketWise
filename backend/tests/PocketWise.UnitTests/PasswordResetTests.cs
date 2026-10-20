using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using PocketWise.Application.DTOs.Auth;
using PocketWise.Application.Features.Auth;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using System.Security.Claims;
using System.Text;
using Xunit;

namespace PocketWise.UnitTests;

public class PasswordResetTests
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
        public List<ApplicationUser> UsersList { get; } = new();
        public string TokenToGenerate { get; set; } = "valid-reset-token-12345";
        public bool ResetPasswordSucceeds { get; set; } = true;

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

        public override Task<ApplicationUser?> FindByIdAsync(string userId) =>
            Task.FromResult(UsersList.FirstOrDefault(u => u.Id.ToString() == userId));

        public override Task<ApplicationUser?> FindByEmailAsync(string email) =>
            Task.FromResult(UsersList.FirstOrDefault(u => string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase)));

        public override Task<string> GeneratePasswordResetTokenAsync(ApplicationUser user) =>
            Task.FromResult(TokenToGenerate);

        public override Task<IdentityResult> ResetPasswordAsync(ApplicationUser user, string token, string newPassword)
        {
            if (ResetPasswordSucceeds && token == TokenToGenerate)
            {
                return Task.FromResult(IdentityResult.Success);
            }

            return Task.FromResult(IdentityResult.Failed(new IdentityError { Description = "Invalid token" }));
        }

        public override Task<IdentityResult> UpdateAsync(ApplicationUser user) =>
            Task.FromResult(IdentityResult.Success);
    }

    private class FakeEmailService : IEmailService
    {
        public bool IsEnabled => true;
        public List<(string To, string Subject, string Body)> SentEmails { get; } = new();

        public Task<bool> SendEmailAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default)
        {
            SentEmails.Add((toEmail, subject, bodyHtml));
            return Task.FromResult(true);
        }
    }

    private class FakeRefreshTokenRepository : IUserRefreshTokenRepository
    {
        public List<long> RevokedUserIds { get; } = new();

        public Task<UserRefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
            Task.FromResult<UserRefreshToken?>(null);
        public Task<IReadOnlyList<UserRefreshToken>> GetActiveByUserIdAsync(long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<UserRefreshToken>>(Array.Empty<UserRefreshToken>());
        public Task AddAsync(UserRefreshToken token, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RevokeAsync(UserRefreshToken token, string? revokedByIp = null, string? reason = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RevokeAllForUserAsync(long userId, string? revokedByIp = null, string? reason = null, CancellationToken cancellationToken = default)
        {
            RevokedUserIds.Add(userId);
            return Task.CompletedTask;
        }
        public Task<int> PurgeExpiredTokensAsync(DateTime? cutoffDate = null, CancellationToken cancellationToken = default) => Task.FromResult(0);
        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private class FakeTokenService : ITokenService
    {
        public AuthResponse GenerateTokenPair(ApplicationUser user, IEnumerable<string>? roles = null) =>
            throw new NotImplementedException();
        public string HashToken(string token) => token;
        public string GenerateRefreshToken() => "fake-refresh-token";
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    [Fact]
    public async Task ForgotPassword_WhenUserExists_SendsEmailWithTokenAndReturnsSuccess()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager();
        var fakeEmailService = new FakeEmailService();
        var fakeRefreshTokenRepo = new FakeRefreshTokenRepository();

        var user = new ApplicationUser
        {
            Id = 101,
            Email = "existinguser@pocketwise.local",
            DisplayName = "Existing User",
            IsActive = true
        };
        fakeUserManager.UsersList.Add(user);

        var authService = new AuthService(
            fakeUserManager,
            fakeRefreshTokenRepo,
            new FakeTokenService(),
            null!,
            fakeEmailService
        );

        // Act
        var result = await authService.ForgotPasswordAsync(
            new ForgotPasswordRequest("existinguser@pocketwise.local"),
            "http://localhost:3000"
        );

        // Assert
        Assert.True(result.Sent);
        Assert.Equal(60, result.CooldownSeconds);
        Assert.Single(fakeEmailService.SentEmails);
        var sentEmail = fakeEmailService.SentEmails[0];
        Assert.Equal("existinguser@pocketwise.local", sentEmail.To);
        Assert.Contains("http://localhost:3000/reset-password?userId=101&token=", sentEmail.Body);
    }

    [Fact]
    public async Task ForgotPassword_WhenUserNotFound_ReturnsSuccessWithoutSendingEmail_AntiEnumeration()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager();
        var fakeEmailService = new FakeEmailService();
        var authService = new AuthService(
            fakeUserManager,
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            fakeEmailService
        );

        // Act
        var result = await authService.ForgotPasswordAsync(
            new ForgotPasswordRequest("nonexistent@pocketwise.local"),
            "http://localhost:3000"
        );

        // Assert
        Assert.True(result.Sent);
        Assert.Empty(fakeEmailService.SentEmails);
    }

    [Fact]
    public async Task ForgotPassword_WhenUserInactive_ReturnsSuccessWithoutSendingEmail_AntiEnumeration()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager();
        var fakeEmailService = new FakeEmailService();
        var user = new ApplicationUser
        {
            Id = 102,
            Email = "inactive@pocketwise.local",
            DisplayName = "Inactive User",
            IsActive = false
        };
        fakeUserManager.UsersList.Add(user);

        var authService = new AuthService(
            fakeUserManager,
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            fakeEmailService
        );

        // Act
        var result = await authService.ForgotPasswordAsync(
            new ForgotPasswordRequest("inactive@pocketwise.local"),
            "http://localhost:3000"
        );

        // Assert
        Assert.True(result.Sent);
        Assert.Empty(fakeEmailService.SentEmails);
    }

    [Fact]
    public async Task ForgotPassword_WhenCalledWithinCooldown_ThrowsAuthException()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager();
        var fakeEmailService = new FakeEmailService();
        var user = new ApplicationUser
        {
            Id = 103,
            Email = "cooldown@pocketwise.local",
            DisplayName = "Cooldown User",
            IsActive = true
        };
        fakeUserManager.UsersList.Add(user);

        var authService = new AuthService(
            fakeUserManager,
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            fakeEmailService
        );

        // Act 1: First request succeeds
        await authService.ForgotPasswordAsync(new ForgotPasswordRequest("cooldown@pocketwise.local"));

        // Act 2: Immediate second request throws COOLDOWN
        var ex = await Assert.ThrowsAsync<AuthException>(() =>
            authService.ForgotPasswordAsync(new ForgotPasswordRequest("cooldown@pocketwise.local")));

        Assert.Equal("COOLDOWN", ex.Code);
    }

    [Fact]
    public async Task ResetPassword_WhenValidTokenAndMatchingPasswords_ResetsPasswordAndRevokesTokens()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager();
        var fakeRefreshTokenRepo = new FakeRefreshTokenRepository();
        var user = new ApplicationUser
        {
            Id = 104,
            Email = "resetok@pocketwise.local",
            DisplayName = "Reset User",
            IsActive = true
        };
        fakeUserManager.UsersList.Add(user);

        var authService = new AuthService(
            fakeUserManager,
            fakeRefreshTokenRepo,
            new FakeTokenService(),
            null!,
            new FakeEmailService()
        );

        var encodedToken = Base64UrlEncode(Encoding.UTF8.GetBytes(fakeUserManager.TokenToGenerate));

        // Act
        var result = await authService.ResetPasswordAsync(new ResetPasswordRequest(
            104,
            encodedToken,
            "NewPassword123!",
            "NewPassword123!"
        ));

        // Assert
        Assert.True(result.Success);
        Assert.Contains(104, fakeRefreshTokenRepo.RevokedUserIds);
    }

    [Fact]
    public async Task ResetPassword_WhenPasswordsDoNotMatch_ThrowsValidationException()
    {
        // Arrange
        var authService = new AuthService(
            new FakeUserManager(),
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            new FakeEmailService()
        );

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AuthException>(() =>
            authService.ResetPasswordAsync(new ResetPasswordRequest(
                105,
                "some-token",
                "NewPassword123!",
                "MismatchPassword456!"
            )));

        Assert.Equal("VALIDATION_ERROR", ex.Code);
    }

    [Fact]
    public async Task ResetPassword_WhenPasswordTooShort_ThrowsValidationException()
    {
        // Arrange
        var authService = new AuthService(
            new FakeUserManager(),
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            new FakeEmailService()
        );

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AuthException>(() =>
            authService.ResetPasswordAsync(new ResetPasswordRequest(
                105,
                "some-token",
                "123",
                "123"
            )));

        Assert.Equal("VALIDATION_ERROR", ex.Code);
    }

    [Fact]
    public async Task ResetPassword_WhenInvalidToken_ThrowsInvalidTokenException()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager { ResetPasswordSucceeds = false };
        var user = new ApplicationUser
        {
            Id = 106,
            Email = "invalidtoken@pocketwise.local",
            DisplayName = "Invalid Token User",
            IsActive = true
        };
        fakeUserManager.UsersList.Add(user);

        var authService = new AuthService(
            fakeUserManager,
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            new FakeEmailService()
        );

        var wrongToken = Base64UrlEncode(Encoding.UTF8.GetBytes("wrong-token"));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AuthException>(() =>
            authService.ResetPasswordAsync(new ResetPasswordRequest(
                106,
                wrongToken,
                "NewPassword123!",
                "NewPassword123!"
            )));

        Assert.Equal("INVALID_TOKEN", ex.Code);
    }
}
