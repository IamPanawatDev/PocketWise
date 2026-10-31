using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/admin/imports")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AdminImportJobsController : ControllerBase
{
    private readonly IAdminImportJobService _importJobService;

    public AdminImportJobsController(IAdminImportJobService importJobService)
    {
        _importJobService = importJobService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<AdminImportJobListResponse>>>> GetImportJobsAsync(
        [FromQuery] string? status,
        [FromQuery] string? jobType,
        [FromQuery] long? userId,
        [FromQuery] string? q,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var filter = new AdminImportJobFilterRequest
        {
            Status = status,
            JobType = jobType,
            UserId = userId,
            Q = q,
            FromDate = fromDate,
            ToDate = toDate,
            Page = page,
            PageSize = pageSize
        };

        var result = await _importJobService.GetImportJobsPagedAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<AdminImportJobListResponse>>.Ok(result));
    }

    [HttpPost("{id:long}/retry")]
    public async Task<ActionResult<ApiResponse<object?>>> RetryImportJobAsync(
        long id,
        CancellationToken cancellationToken)
    {
        try
        {
            var adminId = GetUserId();
            var success = await _importJobService.RetryImportJobAsync(id, adminId, cancellationToken);
            if (!success)
            {
                return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบบันทึกงานนำเข้าที่ระบุ"));
            }

            return Ok(ApiResponse<object?>.Ok(new { message = "เริ่มการลองนำเข้าไฟล์ใหม่อีกครั้งแล้ว" }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.Fail("OPERATION_NOT_ALLOWED", ex.Message));
        }
    }

    [HttpPost("{id:long}/cancel")]
    public async Task<ActionResult<ApiResponse<object?>>> CancelImportJobAsync(
        long id,
        CancellationToken cancellationToken)
    {
        try
        {
            var adminId = GetUserId();
            var success = await _importJobService.CancelImportJobAsync(id, adminId, cancellationToken);
            if (!success)
            {
                return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบบันทึกงานนำเข้าที่ระบุ"));
            }

            return Ok(ApiResponse<object?>.Ok(new { message = "ยกเลิกงานนำเข้าเรียบร้อยแล้ว" }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.Fail("OPERATION_NOT_ALLOWED", ex.Message));
        }
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
