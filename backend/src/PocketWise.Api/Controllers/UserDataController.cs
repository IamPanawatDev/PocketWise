using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Settings;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/users/me")]
[Authorize]
public sealed class UserDataController : ControllerBase
{
    private readonly IUserSettingsService _service;

    public UserDataController(IUserSettingsService service)
    {
        _service = service;
    }

    [HttpPost("data-reset")]
    public async Task<ActionResult<ApiResponse<DataResetResponse>>> ResetAsync(CancellationToken cancellationToken)
    {
        var result = await _service.ResetFinancialDataAsync(GetUserId(), cancellationToken);
        return Ok(ApiResponse<DataResetResponse>.Ok(result));
    }

    private long GetUserId() =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
}
