using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.CategoryRules;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/category-rules")]
[Authorize]
public class CategoryRulesController : ControllerBase
{
    private readonly ICategoryRuleService _categoryRuleService;

    public CategoryRulesController(ICategoryRuleService categoryRuleService)
    {
        _categoryRuleService = categoryRuleService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryRuleResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _categoryRuleService.GetAllAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CategoryRuleResponse>>.Ok(result));
    }

    [HttpGet("suggest")]
    public async Task<ActionResult<ApiResponse<CategorySuggestionResponse?>>> SuggestAsync([FromQuery] string description, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _categoryRuleService.SuggestCategoryAsync(userId, description, cancellationToken);
        return Ok(ApiResponse<CategorySuggestionResponse?>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<CategoryRuleResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _categoryRuleService.GetByIdAsync(id, userId, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<CategoryRuleResponse>.Fail("NOT_FOUND", "ไม่พบกฎจัดหมวดหมู่"));
        }

        return Ok(ApiResponse<CategoryRuleResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CategoryRuleResponse>>> CreateAsync([FromBody] CreateCategoryRuleRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _categoryRuleService.CreateAsync(userId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<CategoryRuleResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<CategoryRuleResponse>>> UpdateAsync(long id, [FromBody] UpdateCategoryRuleRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _categoryRuleService.UpdateAsync(id, userId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<CategoryRuleResponse>.Fail("NOT_FOUND", "ไม่พบกฎจัดหมวดหมู่"));
        }

        return Ok(ApiResponse<CategoryRuleResponse>.Ok(result));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var deleted = await _categoryRuleService.DeleteAsync(id, userId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบกฎจัดหมวดหมู่"));
        }

        return NoContent();
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
