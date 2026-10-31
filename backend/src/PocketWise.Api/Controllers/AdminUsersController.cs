using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _adminUserService;

    public AdminUsersController(IAdminUserService adminUserService)
    {
        _adminUserService = adminUserService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<AdminUserListItemResponse>>>> GetUsersAsync(
        [FromQuery] string? q,
        [FromQuery] string? role,
        [FromQuery] bool? isSuspended,
        [FromQuery] bool? isEmailVerified,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _adminUserService.GetUsersPagedAsync(q, role, isSuspended, isEmailVerified, page, pageSize, cancellationToken);
        return Ok(ApiResponse<PagedResult<AdminUserListItemResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<AdminUserDetailResponse>>> GetUserByIdAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await _adminUserService.GetUserDetailAsync(id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<AdminUserDetailResponse>.Fail("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ"));
        }

        return Ok(ApiResponse<AdminUserDetailResponse>.Ok(result));
    }

    [HttpPost("{id:long}/suspend")]
    public async Task<ActionResult<ApiResponse<object?>>> SuspendUserAsync(
        long id,
        [FromBody] AdminSuspendUserRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(ApiResponse<object?>.Fail("VALIDATION_ERROR", "กรุณาระบุเหตุผลในการระงับบัญชี"));
        }

        var adminId = GetUserId();
        if (id == adminId)
        {
            return BadRequest(ApiResponse<object?>.Fail("OPERATION_NOT_ALLOWED", "ไม่สามารถระงับบัญชีของตนเองได้"));
        }

        var success = await _adminUserService.SuspendUserAsync(id, adminId, request.Reason.Trim(), cancellationToken);
        if (!success)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ"));
        }

        return Ok(ApiResponse<object?>.Ok(new { message = "ระงับบัญชีผู้ใช้เรียบร้อยแล้ว" }));
    }

    [HttpPost("{id:long}/unsuspend")]
    public async Task<ActionResult<ApiResponse<object?>>> UnsuspendUserAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var adminId = GetUserId();
        var success = await _adminUserService.UnsuspendUserAsync(id, adminId, cancellationToken);
        if (!success)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ"));
        }

        return Ok(ApiResponse<object?>.Ok(new { message = "ยกเลิกการระงับบัญชีเรียบร้อยแล้ว" }));
    }

    [HttpPost("{id:long}/resend-verification")]
    public async Task<ActionResult<ApiResponse<object?>>> ResendVerificationAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var success = await _adminUserService.ResendVerificationEmailAsync(id, cancellationToken);
        if (!success)
        {
            return BadRequest(ApiResponse<object?>.Fail("OPERATION_NOT_ALLOWED", "ไม่สามารถส่งอีเมลยืนยันได้ (ผู้ใช้ยืนยันอีเมลแล้ว หรือไม่พบข้อมูล)"));
        }

        return Ok(ApiResponse<object?>.Ok(new { message = "ส่งอีเมลยืนยันบัญชีเรียบร้อยแล้ว" }));
    }

    [HttpPost("{id:long}/reset-password")]
    public async Task<ActionResult<ApiResponse<object?>>> SendResetPasswordLinkAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var token = await _adminUserService.SendPasswordResetLinkAsync(id, cancellationToken);
        if (token == null)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ"));
        }

        return Ok(ApiResponse<object?>.Ok(new { resetToken = token, message = "ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลผู้ใช้เรียบร้อยแล้ว" }));
    }

    [HttpGet("{id:long}/sessions")]
    public async Task<ActionResult<ApiResponse<List<AdminUserSessionResponse>>>> GetSessionsAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var sessions = await _adminUserService.GetUserSessionsAsync(id, null, cancellationToken);
        return Ok(ApiResponse<List<AdminUserSessionResponse>>.Ok(sessions));
    }

    [HttpPost("{id:long}/sessions/{tokenId:long}/revoke")]
    public async Task<ActionResult<ApiResponse<object?>>> RevokeSessionAsync(
        long id,
        long tokenId,
        CancellationToken cancellationToken)
    {
        var adminId = GetUserId();
        var success = await _adminUserService.RevokeSessionAsync(id, tokenId, adminId, cancellationToken);
        if (!success)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบเซสชันที่ระบุ"));
        }

        return Ok(ApiResponse<object?>.Ok(new { message = "เพิกถอนเซสชันเรียบร้อยแล้ว" }));
    }

    [HttpPost("{id:long}/sessions/revoke-all")]
    public async Task<ActionResult<ApiResponse<object?>>> RevokeAllSessionsAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var adminId = GetUserId();
        var count = await _adminUserService.RevokeAllSessionsAsync(id, adminId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(new { revokedCount = count, message = $"เพิกถอนเซสชันทั้งหมดเรียบร้อยแล้ว ({count} เซสชัน)" }));
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
