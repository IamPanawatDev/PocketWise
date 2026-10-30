using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/admin/security-events")]
[Authorize(Roles = "Admin")]
public class AdminSecurityEventsController : ControllerBase
{
    private readonly ISecurityEventService _securityEventService;

    public AdminSecurityEventsController(ISecurityEventService securityEventService)
    {
        _securityEventService = securityEventService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<SecurityEventResponse>>>> GetEventsAsync(
        [FromQuery] string? eventType,
        [FromQuery] long? targetUserId,
        [FromQuery] long? actorUserId,
        [FromQuery] bool? succeeded,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? q,
        [FromQuery] bool maskIp = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var filter = new SecurityEventFilterRequest
        {
            EventType = eventType,
            TargetUserId = targetUserId,
            ActorUserId = actorUserId,
            Succeeded = succeeded,
            FromDate = fromDate,
            ToDate = toDate,
            Q = q,
            Page = page,
            PageSize = pageSize
        };

        var result = await _securityEventService.GetEventsPagedAsync(filter, maskIp, cancellationToken);
        return Ok(ApiResponse<PagedResult<SecurityEventResponse>>.Ok(result));
    }
}
