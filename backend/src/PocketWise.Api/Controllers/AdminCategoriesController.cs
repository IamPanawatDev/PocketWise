using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Categories;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/admin/categories")]
[Authorize]
public class AdminCategoriesController : ControllerBase
{
    private readonly ISystemCategoryService _systemCategoryService;

    public AdminCategoriesController(ISystemCategoryService systemCategoryService)
    {
        _systemCategoryService = systemCategoryService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<IReadOnlyList<CategoryResponse>>.Fail("FORBIDDEN", "คุณไม่มีสิทธิ์ในการจัดการหมวดหมู่มาตรฐานของระบบ"));
        }

        var result = await _systemCategoryService.GetSystemCategoriesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CategoryResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<CategoryResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<CategoryResponse>.Fail("FORBIDDEN", "คุณไม่มีสิทธิ์ในการจัดการหมวดหมู่มาตรฐานของระบบ"));
        }

        var result = await _systemCategoryService.GetSystemCategoryByIdAsync(id, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<CategoryResponse>.Fail("NOT_FOUND", "ไม่พบหมวดหมู่มาตรฐานที่ระบุ"));
        }

        return Ok(ApiResponse<CategoryResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CategoryResponse>>> CreateAsync([FromBody] CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<CategoryResponse>.Fail("FORBIDDEN", "คุณไม่มีสิทธิ์ในการจัดการหมวดหมู่มาตรฐานของระบบ"));
        }

        var actorUserId = GetUserId();
        var result = await _systemCategoryService.CreateSystemCategoryAsync(actorUserId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<CategoryResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<CategoryResponse>>> UpdateAsync(long id, [FromBody] UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<CategoryResponse>.Fail("FORBIDDEN", "คุณไม่มีสิทธิ์ในการจัดการหมวดหมู่มาตรฐานของระบบ"));
        }

        var actorUserId = GetUserId();
        var result = await _systemCategoryService.UpdateSystemCategoryAsync(id, actorUserId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<CategoryResponse>.Fail("NOT_FOUND", "ไม่พบหมวดหมู่มาตรฐานที่ระบุ"));
        }

        return Ok(ApiResponse<CategoryResponse>.Ok(result));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object?>.Fail("FORBIDDEN", "คุณไม่มีสิทธิ์ในการจัดการหมวดหมู่มาตรฐานของระบบ"));
        }

        var actorUserId = GetUserId();
        var deleted = await _systemCategoryService.DeleteSystemCategoryAsync(id, actorUserId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบหมวดหมู่มาตรฐานที่ระบุ"));
        }

        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<ActionResult<ApiResponse<object?>>> ReorderAsync([FromBody] ReorderCategoriesRequest request, CancellationToken cancellationToken)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object?>.Fail("FORBIDDEN", "คุณไม่มีสิทธิ์ในการจัดการหมวดหมู่มาตรฐานของระบบ"));
        }

        var actorUserId = GetUserId();
        await _systemCategoryService.ReorderSystemCategoriesAsync(actorUserId, request, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    [HttpPost("seed-defaults")]
    public async Task<ActionResult<ApiResponse<object>>> SeedDefaultsAsync(CancellationToken cancellationToken)
    {
        if (!IsAdmin())
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object>.Fail("FORBIDDEN", "คุณไม่มีสิทธิ์ในการจัดการหมวดหมู่มาตรฐานของระบบ"));
        }

        var actorUserId = GetUserId();
        var addedCount = await _systemCategoryService.SeedDefaultCategoriesAsync(actorUserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { addedCount, message = $"นำเข้า/คืนค่าหมวดหมู่มาตรฐานสำเร็จ {addedCount} รายการ" }));
    }

    private bool IsAdmin()
    {
        return User.IsInRole("Admin") || User.IsInRole("SuperAdmin");
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
