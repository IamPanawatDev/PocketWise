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

public class EmailVerificationTests
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
        public string TokenToGenerate { get; set; } = "sample-secret-token";
        public bool ConfirmResultSucceeds { get; set; } = true;

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

        public override Task<ApplicationUser?> GetUserAsync(ClaimsPrincipal principal)
        {
            var idClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Task.FromResult(UsersList.FirstOrDefault(u => u.Id.ToString() == idClaim));
        }

        public override Task<string> GenerateEmailConfirmationTokenAsync(ApplicationUser user) =>
            Task.FromResult(TokenToGenerate);

        public override Task<IdentityResult> ConfirmEmailAsync(ApplicationUser user, string token)
        {
            if (ConfirmResultSucceeds && token == TokenToGenerate)
            {
                user.EmailConfirmed = true;
                return Task.FromResult(IdentityResult.Success);
            }

            return Task.FromResult(IdentityResult.Failed(new IdentityError { Description = "Invalid token" }));
        }

        public override Task<IdentityResult> UpdateAsync(ApplicationUser user) =>
            Task.FromResult(IdentityResult.Success);

        public override Task<IdentityResult> CreateAsync(ApplicationUser user, string password)
        {
            user.Id = UsersList.Count + 1;
            UsersList.Add(user);
            return Task.FromResult(IdentityResult.Success);
        }

        public override Task<ApplicationUser?> FindByEmailAsync(string email) =>
            Task.FromResult(UsersList.FirstOrDefault(u => u.Email == email));

        public override Task<IList<string>> GetRolesAsync(ApplicationUser user) =>
            Task.FromResult<IList<string>>(new List<string> { "Member" });

        public override Task<IdentityResult> AddToRoleAsync(ApplicationUser user, string role) =>
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
        public Task<UserRefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
            Task.FromResult<UserRefreshToken?>(null);
        public Task<IReadOnlyList<UserRefreshToken>> GetActiveByUserIdAsync(long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<UserRefreshToken>>(Array.Empty<UserRefreshToken>());
        public Task AddAsync(UserRefreshToken token, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RevokeAsync(UserRefreshToken token, string? revokedByIp = null, string? reason = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RevokeAllForUserAsync(long userId, string? revokedByIp = null, string? reason = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<int> PurgeExpiredTokensAsync(DateTime? cutoffDate = null, CancellationToken cancellationToken = default) => Task.FromResult(0);
        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private class FakeTokenService : ITokenService
    {
        public AuthResponse GenerateTokenPair(ApplicationUser user, IEnumerable<string>? roles = null) =>
            new AuthResponse
            {
                AccessToken = "fake-access-token",
                AccessTokenExpiresAt = DateTime.UtcNow.AddMinutes(15),
                RefreshToken = "fake-refresh-token",
                RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7),
                User = new UserProfileResponse { Id = user.Id, Email = user.Email, DisplayName = user.DisplayName }
            };
        public string HashToken(string token) => token;
        public string GenerateRefreshToken() => "fake-refresh-token";
    }

    [Fact]
    public async Task SendVerificationEmail_WhenValidUser_SendsEmailWithBase64UrlToken()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager();
        var fakeEmailService = new FakeEmailService();
        var user = new ApplicationUser
        {
            Id = 999,
            Email = "testuser@pocketwise.local",
            DisplayName = "Test User",
            IsActive = true,
            IsEmailVerified = false,
            EmailConfirmed = false
        };
        fakeUserManager.UsersList.Add(user);

        var authService = new AuthService(
            fakeUserManager,
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            fakeEmailService
        );

        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "999")
        }, "mock"));

        // Act
        var result = await authService.SendVerificationEmailAsync(claims, "http://localhost:3000");

        // Assert
        Assert.True(result.Sent);
        Assert.Equal("testuser@pocketwise.local", result.Email);
        Assert.Equal(60, result.CooldownSeconds);
        Assert.Single(fakeEmailService.SentEmails);
        var sentEmail = fakeEmailService.SentEmails[0];
        Assert.Equal("testuser@pocketwise.local", sentEmail.To);
        Assert.Contains("http://localhost:3000/verify-email?userId=999&token=", sentEmail.Body);
    }

    [Fact]
    public async Task SendVerificationEmail_WhenCooldownActive_ThrowsAuthException()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager();
        var fakeEmailService = new FakeEmailService();
        var user = new ApplicationUser
        {
            Id = 888,
            Email = "cooldown@pocketwise.local",
            DisplayName = "Cooldown User",
            IsActive = true,
            IsEmailVerified = false,
            EmailConfirmed = false
        };
        fakeUserManager.UsersList.Add(user);

        var authService = new AuthService(
            fakeUserManager,
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            fakeEmailService
        );

        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "888")
        }, "mock"));

        // First call - should succeed
        await authService.SendVerificationEmailAsync(claims, "http://localhost:3000");

        // Act & Assert - second call within 60s must throw AuthException
        var ex = await Assert.ThrowsAsync<AuthException>(() =>
            authService.SendVerificationEmailAsync(claims, "http://localhost:3000"));

        Assert.Equal("COOLDOWN", ex.Code);
    }

    [Fact]
    public async Task VerifyEmail_WhenTokenValid_UpdatesUserToVerified()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager { TokenToGenerate = "my-secret-token-xyz" };
        var fakeEmailService = new FakeEmailService();
        var user = new ApplicationUser
        {
            Id = 777,
            Email = "verify@pocketwise.local",
            DisplayName = "Verify User",
            IsActive = true,
            IsEmailVerified = false,
            EmailConfirmed = false
        };
        fakeUserManager.UsersList.Add(user);

        var authService = new AuthService(
            fakeUserManager,
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            fakeEmailService
        );

        // Encode token to Base64Url
        var rawBytes = Encoding.UTF8.GetBytes("my-secret-token-xyz");
        var base64UrlToken = Convert.ToBase64String(rawBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');

        // Act
        var result = await authService.VerifyEmailAsync(new VerifyEmailRequest(777, base64UrlToken));

        // Assert
        Assert.True(result.Verified);
        Assert.Equal("verify@pocketwise.local", result.Email);
        Assert.True(user.IsEmailVerified);
        Assert.True(user.EmailConfirmed);
    }

    [Fact]
    public async Task VerifyEmail_WhenTokenInvalid_ThrowsAuthException()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager
        {
            TokenToGenerate = "valid-token",
            ConfirmResultSucceeds = false
        };
        var fakeEmailService = new FakeEmailService();
        var user = new ApplicationUser
        {
            Id = 666,
            Email = "invalid@pocketwise.local",
            DisplayName = "Invalid Token User",
            IsActive = true,
            IsEmailVerified = false,
            EmailConfirmed = false
        };
        fakeUserManager.UsersList.Add(user);

        var authService = new AuthService(
            fakeUserManager,
            new FakeRefreshTokenRepository(),
            new FakeTokenService(),
            null!,
            fakeEmailService
        );

        var rawBytes = Encoding.UTF8.GetBytes("wrong-token");
        var wrongToken = Convert.ToBase64String(rawBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AuthException>(() =>
            authService.VerifyEmailAsync(new VerifyEmailRequest(666, wrongToken)));

        Assert.Equal("INVALID_TOKEN", ex.Code);
    }

    [Fact]
    public async Task VerifyEmail_WhenAlreadyVerified_ReturnsSuccessImmediately()
    {
        // Arrange
        var fakeUserManager = new FakeUserManager();
        var fakeEmailService = new FakeEmailService();
        var user = new ApplicationUser
        {
            Id = 555,
            Email = "already@pocketwise.local",
            DisplayName = "Already Verified User",
            IsActive = true,
            IsEmailVerified = true,
            EmailConfirmed = true
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
        var result = await authService.VerifyEmailAsync(new VerifyEmailRequest(555, "any-token"));

        // Assert
        Assert.True(result.Verified);
        Assert.Equal("already@pocketwise.local", result.Email);
        Assert.Contains("ได้รับการยืนยันเรียบร้อยแล้ว", result.Message);
    }

    [Fact]
    public async Task RegisterAsync_AutomaticallySendsVerificationEmail()
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

        var request = new RegisterRequest
        {
            Email = "newuser@pocketwise.local",
            Password = "SecurePassword123!",
            DisplayName = "New User"
        };

        // Act
        var result = await authService.RegisterAsync(request, "127.0.0.1", "AgentTest", "http://localhost:3000");

        // Assert
        Assert.NotNull(result);
        Assert.Single(fakeEmailService.SentEmails);
        var sent = fakeEmailService.SentEmails[0];
        Assert.Equal("newuser@pocketwise.local", sent.To);
        Assert.Contains("ยืนยันที่อยู่อีเมลของคุณ", sent.Subject);
        Assert.Contains("/verify-email?userId=", sent.Body);
    }
}
