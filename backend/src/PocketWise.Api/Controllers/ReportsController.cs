using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Reports;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize]
public sealed class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<ReportSummaryResponse>>> GetSummaryAsync(
        [FromQuery] DateTimeOffset fromDate,
        [FromQuery] DateTimeOffset toDate,
        [FromQuery] long? categoryId,
        [FromQuery] long? tagId,
        CancellationToken cancellationToken)
    {
        var result = await _reportService.GetSummaryAsync(
            GetUserId(),
            fromDate,
            toDate,
            categoryId,
            tagId,
            cancellationToken);
        return Ok(ApiResponse<ReportSummaryResponse>.Ok(result));
    }

    [HttpGet("trends")]
    public async Task<ActionResult<ApiResponse<ReportTrendResponse>>> GetTrendsAsync(
        [FromQuery] DateTimeOffset fromDate,
        [FromQuery] DateTimeOffset toDate,
        [FromQuery] string period,
        [FromQuery] long? categoryId,
        [FromQuery] long? tagId,
        CancellationToken cancellationToken)
    {
        var result = await _reportService.GetTrendsAsync(
            GetUserId(),
            fromDate,
            toDate,
            period,
            categoryId,
            tagId,
            cancellationToken);
        return Ok(ApiResponse<ReportTrendResponse>.Ok(result));
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
