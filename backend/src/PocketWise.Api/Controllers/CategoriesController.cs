using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Categories;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _categoryService.GetAllAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CategoryResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<CategoryResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _categoryService.GetByIdAsync(id, userId, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<CategoryResponse>.Fail("NOT_FOUND", "ไม่พบหมวดหมู่"));
        }

        return Ok(ApiResponse<CategoryResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CategoryResponse>>> CreateAsync([FromBody] CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _categoryService.CreateAsync(userId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<CategoryResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<CategoryResponse>>> UpdateAsync(long id, [FromBody] UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _categoryService.UpdateAsync(id, userId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<CategoryResponse>.Fail("NOT_FOUND", "ไม่พบหมวดหมู่"));
        }

        return Ok(ApiResponse<CategoryResponse>.Ok(result));
    }

    [HttpPut("reorder")]
    public async Task<ActionResult<ApiResponse<object?>>> ReorderAsync([FromBody] ReorderCategoriesRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        await _categoryService.ReorderAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var deleted = await _categoryService.DeleteAsync(id, userId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบหมวดหมู่"));
        }

        return NoContent();
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
