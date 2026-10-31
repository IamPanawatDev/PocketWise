using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Roles;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AdminRolesController : ControllerBase
{
    private readonly IRolePermissionService _roleService;

    public AdminRolesController(IRolePermissionService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet("roles")]
    public async Task<ActionResult<ApiResponse<List<RoleResponse>>>> GetRolesAsync(CancellationToken cancellationToken)
    {
        var roles = await _roleService.GetRolesAsync(cancellationToken);
        return Ok(ApiResponse<List<RoleResponse>>.Ok(roles));
    }

    [HttpGet("roles/{id:long}")]
    public async Task<ActionResult<ApiResponse<RoleDetailResponse>>> GetRoleByIdAsync(long id, CancellationToken cancellationToken)
    {
        var role = await _roleService.GetRoleByIdAsync(id, cancellationToken);
        if (role == null)
        {
            return NotFound(ApiResponse<RoleDetailResponse>.Fail("NOT_FOUND", "ไม่พบบทบาทที่ระบุ"));
        }
        return Ok(ApiResponse<RoleDetailResponse>.Ok(role));
    }

    [HttpPost("roles")]
    public async Task<ActionResult<ApiResponse<RoleDetailResponse>>> CreateRoleAsync([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var actorUserId = GetUserId();
            var created = await _roleService.CreateRoleAsync(actorUserId, request, cancellationToken);
            return CreatedAtAction(nameof(GetRoleByIdAsync), new { id = created.Id }, ApiResponse<RoleDetailResponse>.Ok(created));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<RoleDetailResponse>.Fail("VALIDATION_ERROR", ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<RoleDetailResponse>.Fail("CONFLICT", ex.Message));
        }
    }

    [HttpPut("roles/{id:long}")]
    public async Task<ActionResult<ApiResponse<RoleDetailResponse>>> UpdateRoleAsync(long id, [FromBody] UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var actorUserId = GetUserId();
            var updated = await _roleService.UpdateRoleAsync(id, actorUserId, request, cancellationToken);
            if (updated == null)
            {
                return NotFound(ApiResponse<RoleDetailResponse>.Fail("NOT_FOUND", "ไม่พบบทบาทที่ระบุ"));
            }
            return Ok(ApiResponse<RoleDetailResponse>.Ok(updated));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<RoleDetailResponse>.Fail("VALIDATION_ERROR", ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<RoleDetailResponse>.Fail("CONFLICT", ex.Message));
        }
    }

    [HttpDelete("roles/{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteRoleAsync(long id, CancellationToken cancellationToken)
    {
        try
        {
            var actorUserId = GetUserId();
            var deleted = await _roleService.DeleteRoleAsync(id, actorUserId, cancellationToken);
            if (!deleted)
            {
                return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบบทบาทที่ระบุ"));
            }
            return Ok(ApiResponse<object?>.Ok(null));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.Fail("OPERATION_NOT_ALLOWED", ex.Message));
        }
    }

    [HttpGet("permissions")]
    public async Task<ActionResult<ApiResponse<List<PermissionResponse>>>> GetAllPermissionsAsync(CancellationToken cancellationToken)
    {
        var permissions = await _roleService.GetAllPermissionsAsync(cancellationToken);
        return Ok(ApiResponse<List<PermissionResponse>>.Ok(permissions));
    }

    [HttpPut("roles/{id:long}/permissions")]
    public async Task<ActionResult<ApiResponse<RoleDetailResponse>>> UpdateRolePermissionsAsync(long id, [FromBody] UpdateRolePermissionsRequest request, CancellationToken cancellationToken)
    {
        var actorUserId = GetUserId();
        var updated = await _roleService.UpdateRolePermissionsAsync(id, actorUserId, request, cancellationToken);
        if (updated == null)
        {
            return NotFound(ApiResponse<RoleDetailResponse>.Fail("NOT_FOUND", "ไม่พบบทบาทที่ระบุ"));
        }
        return Ok(ApiResponse<RoleDetailResponse>.Ok(updated));
    }

    [HttpGet("user-roles")]
    public async Task<ActionResult<ApiResponse<List<UserWithRolesResponse>>>> GetUsersWithRolesAsync(CancellationToken cancellationToken)
    {
        var users = await _roleService.GetUsersWithRolesAsync(cancellationToken);
        return Ok(ApiResponse<List<UserWithRolesResponse>>.Ok(users));
    }

    [HttpPut("users/{userId:long}/roles")]
    public async Task<ActionResult<ApiResponse<UserWithRolesResponse>>> AssignUserRolesAsync(long userId, [FromBody] AssignUserRolesRequest request, CancellationToken cancellationToken)
    {
        var actorUserId = GetUserId();
        var updated = await _roleService.AssignUserRolesAsync(userId, actorUserId, request, cancellationToken);
        if (updated == null)
        {
            return NotFound(ApiResponse<UserWithRolesResponse>.Fail("NOT_FOUND", "ไม่พบผู้ใช้ที่ระบุ"));
        }
        return Ok(ApiResponse<UserWithRolesResponse>.Ok(updated));
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
