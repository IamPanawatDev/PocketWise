using Microsoft.AspNetCore.Identity;
using FluentValidation;
using PocketWise.Application.DTOs.Auth;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text;

namespace PocketWise.Application.Features.Auth;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IUserRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenService _tokenService;
    private readonly IValidator<UpdateUserProfileRequest> _profileValidator;
    private readonly IEmailService _emailService;
    private readonly IAuditLogService? _auditLogService;

    private static readonly ConcurrentDictionary<long, DateTime> _verificationCooldowns = new();

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IUserRefreshTokenRepository refreshTokenRepository,
        ITokenService tokenService,
        IValidator<UpdateUserProfileRequest> profileValidator,
        IEmailService emailService,
        IAuditLogService? auditLogService = null)
    {
        _userManager = userManager;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenService = tokenService;
        _profileValidator = profileValidator;
        _emailService = emailService;
        _auditLogService = auditLogService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            throw new AuthException("CONFLICT", "อีเมลนี้ถูกใช้งานแล้ว");
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

        // Assign default 'Member' role
        await _userManager.AddToRoleAsync(user, "Member");

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

        var profile = MapToProfile(applicationUser);
        var roles = await _userManager.GetRolesAsync(applicationUser);
        profile.Roles = roles.ToList();
        return profile;
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
            applicationUser.EmailConfirmed = false;
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

        var updatedProfile = MapToProfile(applicationUser);
        var roles = await _userManager.GetRolesAsync(applicationUser);
        updatedProfile.Roles = roles.ToList();

        if (_auditLogService != null && long.TryParse(userIdValue, out var uId))
        {
            await _auditLogService.LogAsync(
                uId,
                AuditAction.Update,
                "Users",
                userIdValue,
                new
                {
                    request.DisplayName,
                    request.PhoneNumber,
                    request.BirthDate,
                    EmailChanged = emailChanged
                },
                cancellationToken);
        }

        return updatedProfile;
    }

    public async Task<SendVerificationEmailResponse> SendVerificationEmailAsync(
        ClaimsPrincipal user,
        string? originUrl = null,
        CancellationToken cancellationToken = default)
    {
        var userIdValue = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdValue is null || !long.TryParse(userIdValue, out var userId))
        {
            throw new AuthException("UNAUTHORIZED", "ไม่พบข้อมูลผู้ใช้");
        }

        var applicationUser = await _userManager.FindByIdAsync(userIdValue);
        if (applicationUser is null || !applicationUser.IsActive)
        {
            throw new AuthException("UNAUTHORIZED", "ไม่พบบัญชีผู้ใช้");
        }

        if (string.IsNullOrWhiteSpace(applicationUser.Email))
        {
            throw new AuthException("VALIDATION_ERROR", "บัญชีนี้ไม่มีที่อยู่อีเมล");
        }

        if (applicationUser.IsEmailVerified && applicationUser.EmailConfirmed)
        {
            throw new AuthException("ALREADY_VERIFIED", "ที่อยู่อีเมลนี้ได้รับการยืนยันเรียบร้อยแล้ว");
        }

        if (_verificationCooldowns.TryGetValue(userId, out var lastSent))
        {
            var elapsed = DateTime.UtcNow - lastSent;
            if (elapsed < TimeSpan.FromSeconds(60))
            {
                var remaining = (int)Math.Ceiling((TimeSpan.FromSeconds(60) - elapsed).TotalSeconds);
                throw new AuthException("COOLDOWN", $"กรุณารออีก {remaining} วินาทีก่อนส่งลิงก์ยืนยันใหม่อีกครั้ง");
            }
        }

        var rawToken = await _userManager.GenerateEmailConfirmationTokenAsync(applicationUser);
        var encodedToken = Base64UrlEncode(Encoding.UTF8.GetBytes(rawToken));

        var baseUrl = !string.IsNullOrWhiteSpace(originUrl) ? originUrl.TrimEnd('/') : "http://localhost:3000";
        var verificationUrl = $"{baseUrl}/verify-email?userId={applicationUser.Id}&token={encodedToken}";

        var bodyHtml = $"""
            <!DOCTYPE html>
            <html lang="th">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>
            <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b;">
              <div style="max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #4f46e5; margin: 0 0 8px 0; font-size: 22px;">ยืนยันที่อยู่อีเมลของคุณ</h2>
                  <p style="color: #64748b; font-size: 14px; margin: 0;">PocketWise — ระบบบันทึกรายรับรายจ่ายอัจฉริยะ</p>
                </div>
                <p style="font-size: 15px; line-height: 1.6;">สวัสดีคุณ <strong>{applicationUser.DisplayName}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155;">คุณได้ร้องขอการยืนยันที่อยู่อีเมลสำหรับบัญชี PocketWise ของคุณ กรุณากดปุ่มด้านล่างเพื่อยืนยันบัญชีให้สมบูรณ์:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="{verificationUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; font-size: 15px; padding: 12px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                    ยืนยันที่อยู่อีเมล
                  </a>
                </div>
                <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px;">
                  หากปุ่มด้านบนไม่ทำงาน สามารถคัดลอกลิงก์ด้านล่างไปวางในแถบที่อยู่ของเว็บเบราว์เซอร์ได้:<br/>
                  <a href="{verificationUrl}" style="color: #4f46e5; word-break: break-all;">{verificationUrl}</a>
                </p>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                  หากคุณไม่ได้ส่งคำขอนี้ สามารถละเว้นอีเมลฉบับนี้ได้อย่างปลอดภัย<br/>
                  ลิงก์นี้ใช้ได้เฉพาะบัญชีของคุณเท่านั้น
                </p>
              </div>
            </body>
            </html>
            """;

        await _emailService.SendEmailAsync(
            applicationUser.Email,
            "ยืนยันที่อยู่อีเมลของคุณ — PocketWise",
            bodyHtml,
            cancellationToken);

        _verificationCooldowns[userId] = DateTime.UtcNow;

        return new SendVerificationEmailResponse(
            true,
            applicationUser.Email,
            60,
            "ส่งลิงก์ยืนยันทางอีเมลเรียบร้อยแล้ว"
        );
    }

    public async Task<VerifyEmailResponse> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default)
    {
        if (request.UserId <= 0 || string.IsNullOrWhiteSpace(request.Token))
        {
            throw new AuthException("VALIDATION_ERROR", "ข้อมูลสำหรับยืนยันอีเมลไม่ถูกต้อง");
        }

        var user = await _userManager.FindByIdAsync(request.UserId.ToString());
        if (user is null || !user.IsActive)
        {
            throw new AuthException("NOT_FOUND", "ไม่พบบัญชีผู้ใช้");
        }

        if (user.IsEmailVerified && user.EmailConfirmed)
        {
            return new VerifyEmailResponse(true, user.Email ?? string.Empty, "ที่อยู่อีเมลนี้ได้รับการยืนยันเรียบร้อยแล้ว");
        }

        string rawToken;
        try
        {
            rawToken = Encoding.UTF8.GetString(Base64UrlDecode(request.Token));
        }
        catch
        {
            throw new AuthException("INVALID_TOKEN", "รูปแบบโทเค็นยืนยันอีเมลไม่ถูกต้อง");
        }

        var result = await _userManager.ConfirmEmailAsync(user, rawToken);
        if (!result.Succeeded)
        {
            throw new AuthException("INVALID_TOKEN", "ลิงก์ยืนยันอีเมลไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ยืนยันใหม่");
        }

        user.IsEmailVerified = true;
        user.EmailConfirmed = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return new VerifyEmailResponse(true, user.Email ?? string.Empty, "ยืนยันที่อยู่อีเมลสำเร็จเรียบร้อยแล้ว");
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    private static byte[] Base64UrlDecode(string text)
    {
        var base64 = text.Replace("-", "+").Replace("_", "/");
        switch (base64.Length % 4)
        {
            case 2: base64 += "=="; break;
            case 3: base64 += "="; break;
        }
        return Convert.FromBase64String(base64);
    }

    private async Task<AuthResponse> GenerateTokenPairAndSaveAsync(ApplicationUser user, string? ipAddress, string? userAgent, CancellationToken cancellationToken)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var response = _tokenService.GenerateTokenPair(user, roles);

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
