using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Settings;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/settings")]
[Authorize]
public sealed class UserSettingsController : ControllerBase
{
    private readonly IUserSettingsService _service;

    public UserSettingsController(IUserSettingsService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<UserSettingsResponse>>> GetAsync(CancellationToken cancellationToken)
    {
        var result = await _service.GetAsync(GetUserId(), cancellationToken);
        return Ok(ApiResponse<UserSettingsResponse>.Ok(result));
    }

    [HttpPut]
    public async Task<ActionResult<ApiResponse<UserSettingsResponse>>> UpdateAsync(
        [FromBody] UpdateUserSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(GetUserId(), request, cancellationToken);
        return Ok(ApiResponse<UserSettingsResponse>.Ok(result));
    }

    private long GetUserId() =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
}
