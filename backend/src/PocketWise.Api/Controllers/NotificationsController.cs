using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.Features.Notifications;
using PocketWise.Application.Features.Notifications.DTOs;

namespace PocketWise.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<NotificationResponse>>>> GetNotificationsAsync(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool unreadOnly = false,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        var result = await _notificationService.GetNotificationsAsync(userId, page, pageSize, unreadOnly, cancellationToken);
        return Ok(ApiResponse<PagedResult<NotificationResponse>>.Ok(result));
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<ApiResponse<NotificationUnreadCountResponse>>> GetUnreadCountAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        var result = await _notificationService.GetUnreadCountAsync(userId, cancellationToken);
        return Ok(ApiResponse<NotificationUnreadCountResponse>.Ok(result));
    }

    [HttpPut("{id:long}/read")]
    public async Task<ActionResult<ApiResponse<NotificationResponse>>> MarkAsReadAsync(
        long id,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        var result = await _notificationService.MarkAsReadAsync(userId, id, cancellationToken);
        return Ok(ApiResponse<NotificationResponse>.Ok(result));
    }

    [HttpPut("read-all")]
    public async Task<ActionResult<ApiResponse<BatchReadNotificationsResponse>>> MarkAllAsReadAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        var result = await _notificationService.MarkAllAsReadAsync(userId, cancellationToken);
        return Ok(ApiResponse<BatchReadNotificationsResponse>.Ok(result));
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
