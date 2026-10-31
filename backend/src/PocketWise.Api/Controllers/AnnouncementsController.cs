using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/announcements")]
[AllowAnonymous]
public class AnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _announcementService;

    public AnnouncementsController(IAnnouncementService announcementService)
    {
        _announcementService = announcementService;
    }

    [HttpGet("active")]
    public async Task<ActionResult<ApiResponse<List<UserAnnouncementResponse>>>> GetActiveAnnouncementsAsync(CancellationToken cancellationToken)
    {
        long? userId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (long.TryParse(value, out var id))
            {
                userId = id;
            }
        }

        var list = await _announcementService.GetActiveAnnouncementsForUserAsync(userId, cancellationToken);
        return Ok(ApiResponse<List<UserAnnouncementResponse>>.Ok(list));
    }
}
