using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.AuditLogs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Enums;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/audit-logs")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<AuditLogResponse>>>> GetAllAsync(
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] string? entityId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? q,
        [FromQuery] long? userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        AuditAction? parsedAction = null;
        if (!string.IsNullOrWhiteSpace(action) && Enum.TryParse<AuditAction>(action, true, out var a))
        {
            parsedAction = a;
        }

        var filter = new AuditLogFilter
        {
            Action = parsedAction,
            EntityType = entityType,
            EntityId = entityId,
            FromDate = fromDate,
            ToDate = toDate,
            Q = q,
            UserId = userId
        };

        var result = await _auditLogService.GetLogsPagedAsync(currentUserId, isAdmin, filter, page, pageSize, cancellationToken);
        return Ok(ApiResponse<PagedResult<AuditLogResponse>>.Ok(result));
    }

    [HttpGet("entity-types")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<string>>>> GetEntityTypesAsync(
        CancellationToken cancellationToken = default)
    {
        var currentUserId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var types = await _auditLogService.GetEntityTypesAsync(currentUserId, isAdmin, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<string>>.Ok(types));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<AuditLogResponse>>> GetByIdAsync(
        long id,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var log = await _auditLogService.GetLogByIdAsync(id, currentUserId, isAdmin, cancellationToken);
        if (log is null)
        {
            return NotFound(ApiResponse<AuditLogResponse>.Fail("AUDIT_LOG_NOT_FOUND", "ไม่พบประวัติการเปลี่ยนแปลงที่ระบุ"));
        }

        return Ok(ApiResponse<AuditLogResponse>.Ok(log));
    }

    private long GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
