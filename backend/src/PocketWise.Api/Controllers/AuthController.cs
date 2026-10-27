using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Auth;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RegisterAsync([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var originUrl = Request.Headers["Origin"].FirstOrDefault() ?? Request.Headers["Referer"].FirstOrDefault();
        var result = await _authService.RegisterAsync(request, GetIpAddress(), GetUserAgent(), originUrl, cancellationToken);
        return Ok(ApiResponse<AuthResponse>.Ok(result));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> LoginAsync([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, GetIpAddress(), GetUserAgent(), cancellationToken);
        if (result is null)
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail("INVALID_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
        }

        return Ok(ApiResponse<AuthResponse>.Ok(result));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RefreshAsync([FromBody] RefreshRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshAsync(request, GetIpAddress(), GetUserAgent(), cancellationToken);
        if (result is null)
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail("INVALID_REFRESH_TOKEN", "Refresh token ไม่ถูกต้องหรือหมดอายุ"));
        }

        return Ok(ApiResponse<AuthResponse>.Ok(result));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object?>>> LogoutAsync(CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(User, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserProfileResponse>>> MeAsync(CancellationToken cancellationToken)
    {
        var result = await _authService.MeAsync(User, cancellationToken);
        if (result is null)
        {
            return Unauthorized(ApiResponse<UserProfileResponse>.Fail("UNAUTHORIZED", "ไม่พบข้อมูลผู้ใช้"));
        }

        return Ok(ApiResponse<UserProfileResponse>.Ok(result));
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserProfileResponse>>> UpdateMeAsync(
        [FromBody] UpdateUserProfileRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.UpdateProfileAsync(User, request, cancellationToken);
        if (result is null)
        {
            return Unauthorized(ApiResponse<UserProfileResponse>.Fail("UNAUTHORIZED", "ไม่พบข้อมูลผู้ใช้"));
        }

        return Ok(ApiResponse<UserProfileResponse>.Ok(result));
    }

    [HttpPost("send-verification-email")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<SendVerificationEmailResponse>>> SendVerificationEmailAsync(CancellationToken cancellationToken)
    {
        var originUrl = Request.Headers.Origin.FirstOrDefault()
            ?? Request.Headers.Referer.FirstOrDefault();

        var result = await _authService.SendVerificationEmailAsync(User, originUrl, cancellationToken);
        return Ok(ApiResponse<SendVerificationEmailResponse>.Ok(result));
    }

    [HttpPost("verify-email")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<VerifyEmailResponse>>> VerifyEmailAsync(
        [FromBody] VerifyEmailRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.VerifyEmailAsync(request, cancellationToken);
        return Ok(ApiResponse<VerifyEmailResponse>.Ok(result));
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<ForgotPasswordResponse>>> ForgotPasswordAsync(
        [FromBody] ForgotPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var originUrl = Request.Headers.Origin.FirstOrDefault()
            ?? Request.Headers.Referer.FirstOrDefault();

        var result = await _authService.ForgotPasswordAsync(request, originUrl, cancellationToken);
        return Ok(ApiResponse<ForgotPasswordResponse>.Ok(result));
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<ResetPasswordResponse>>> ResetPasswordAsync(
        [FromBody] ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ResetPasswordAsync(request, cancellationToken);
        return Ok(ApiResponse<ResetPasswordResponse>.Ok(result));
    }

    [HttpPost("purge-expired-tokens")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> PurgeExpiredTokensAsync(CancellationToken cancellationToken)
    {
        var deletedCount = await _authService.PurgeExpiredRefreshTokensAsync(cancellationToken);
        return Ok(ApiResponse<object>.Ok(new
        {
            deletedCount,
            message = $"ล้าง Refresh Token ที่หมดอายุแล้วเรียบร้อย ({deletedCount} รายการ)"
        }));
    }

    private string? GetIpAddress()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            return forwardedFor.FirstOrDefault();
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private string? GetUserAgent()
    {
        return Request.Headers.UserAgent.FirstOrDefault();
    }
}
