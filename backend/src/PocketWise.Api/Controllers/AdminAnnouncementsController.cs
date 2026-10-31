using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/admin/announcements")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AdminAnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _announcementService;

    public AdminAnnouncementsController(IAnnouncementService announcementService)
    {
        _announcementService = announcementService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<AnnouncementResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var list = await _announcementService.GetAllAnnouncementsAsync(cancellationToken);
        return Ok(ApiResponse<List<AnnouncementResponse>>.Ok(list));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<AnnouncementResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var item = await _announcementService.GetAnnouncementByIdAsync(id, cancellationToken);
        if (item == null)
        {
            return NotFound(ApiResponse<AnnouncementResponse>.Fail("NOT_FOUND", "ไม่พบประกาศที่ระบุ"));
        }

        return Ok(ApiResponse<AnnouncementResponse>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<AnnouncementResponse>>> CreateAsync(
        [FromBody] CreateAnnouncementRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(ApiResponse<AnnouncementResponse>.Fail("VALIDATION_ERROR", "กรุณากรอกหัวข้อและเนื้อหาประกาศ"));
        }

        if (request.EndsAt <= request.StartsAt)
        {
            return BadRequest(ApiResponse<AnnouncementResponse>.Fail("VALIDATION_ERROR", "เวลาสิ้นสุดประกาศต้องมากกว่าเวลาเริ่มต้น"));
        }

        var adminId = GetUserId();
        var created = await _announcementService.CreateAnnouncementAsync(adminId, request, cancellationToken);
        return CreatedAtAction(nameof(GetByIdAsync), new { id = created.AnnouncementId }, ApiResponse<AnnouncementResponse>.Ok(created));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<AnnouncementResponse>>> UpdateAsync(
        long id,
        [FromBody] UpdateAnnouncementRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(ApiResponse<AnnouncementResponse>.Fail("VALIDATION_ERROR", "กรุณากรอกหัวข้อและเนื้อหาประกาศ"));
        }

        if (request.EndsAt <= request.StartsAt)
        {
            return BadRequest(ApiResponse<AnnouncementResponse>.Fail("VALIDATION_ERROR", "เวลาสิ้นสุดประกาศต้องมากกว่าเวลาเริ่มต้น"));
        }

        var adminId = GetUserId();
        var updated = await _announcementService.UpdateAnnouncementAsync(id, adminId, request, cancellationToken);
        if (updated == null)
        {
            return NotFound(ApiResponse<AnnouncementResponse>.Fail("NOT_FOUND", "ไม่พบประกาศที่ระบุ"));
        }

        return Ok(ApiResponse<AnnouncementResponse>.Ok(updated));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var adminId = GetUserId();
        var deleted = await _announcementService.DeleteAnnouncementAsync(id, adminId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบประกาศที่ระบุ"));
        }

        return Ok(ApiResponse<object?>.Ok(new { message = "ลบประกาศเรียบร้อยแล้ว" }));
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
