using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/admin/overview")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AdminOverviewController : ControllerBase
{
    private readonly IAdminDashboardService _dashboardService;

    public AdminOverviewController(IAdminDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<AdminDashboardOverviewResponse>>> GetOverviewAsync(CancellationToken cancellationToken)
    {
        var overview = await _dashboardService.GetOverviewAsync(cancellationToken);
        return Ok(ApiResponse<AdminDashboardOverviewResponse>.Ok(overview));
    }
}
