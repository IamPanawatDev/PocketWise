using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Roles = "Admin")]
public class AdminSystemSettingsController : ControllerBase
{
    private readonly IAdminSystemSettingsService _settingsService;
    private readonly IMaintenanceModeService _maintenanceService;

    public AdminSystemSettingsController(
        IAdminSystemSettingsService settingsService,
        IMaintenanceModeService maintenanceService)
    {
        _settingsService = settingsService;
        _maintenanceService = maintenanceService;
    }

    [HttpGet("settings")]
    public async Task<ActionResult<ApiResponse<List<SystemSettingResponse>>>> GetAllSettingsAsync(CancellationToken cancellationToken)
    {
        var settings = await _settingsService.GetAllSettingsAsync(cancellationToken);
        return Ok(ApiResponse<List<SystemSettingResponse>>.Ok(settings));
    }

    [HttpPut("settings/{key}")]
    public async Task<ActionResult<ApiResponse<SystemSettingResponse>>> UpdateSettingAsync(
        string key,
        [FromBody] UpdateSystemSettingRequest request,
        CancellationToken cancellationToken)
    {
        var adminId = GetUserId();
        var updated = await _settingsService.UpdateSettingAsync(key, request.Value, adminId, cancellationToken);
        if (updated == null)
        {
            return NotFound(ApiResponse<SystemSettingResponse>.Fail("NOT_FOUND", "ไม่พบการตั้งค่าที่ระบุ"));
        }

        return Ok(ApiResponse<SystemSettingResponse>.Ok(updated));
    }

    [HttpGet("maintenance")]
    public async Task<ActionResult<ApiResponse<MaintenanceStatusResponse>>> GetMaintenanceStatusAsync(CancellationToken cancellationToken)
    {
        var status = await _maintenanceService.GetStatusAsync(cancellationToken);
        return Ok(ApiResponse<MaintenanceStatusResponse>.Ok(status));
    }

    [HttpPut("maintenance")]
    public async Task<ActionResult<ApiResponse<MaintenanceStatusResponse>>> UpdateMaintenanceStatusAsync(
        [FromBody] UpdateMaintenanceRequest request,
        CancellationToken cancellationToken)
    {
        var adminId = GetUserId();
        var status = await _maintenanceService.UpdateStatusAsync(adminId, request, cancellationToken);
        return Ok(ApiResponse<MaintenanceStatusResponse>.Ok(status));
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
