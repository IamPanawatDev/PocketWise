using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Budgets;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/budgets")]
[Authorize]
public class BudgetsController : ControllerBase
{
    private readonly IBudgetService _budgetService;

    public BudgetsController(IBudgetService budgetService)
    {
        _budgetService = budgetService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BudgetResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _budgetService.GetAllAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<BudgetResponse>>.Ok(result));
    }

    [HttpGet("tracking")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BudgetTrackingResponse>>>> GetTrackingAsync(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _budgetService.GetTrackingAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<BudgetTrackingResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<BudgetResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _budgetService.GetByIdAsync(id, userId, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<BudgetResponse>.Fail("NOT_FOUND", "ไม่พบงบประมาณ"));
        }

        return Ok(ApiResponse<BudgetResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<BudgetResponse>>> CreateAsync([FromBody] CreateBudgetRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _budgetService.CreateAsync(userId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<BudgetResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<BudgetResponse>>> UpdateAsync(long id, [FromBody] UpdateBudgetRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _budgetService.UpdateAsync(id, userId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<BudgetResponse>.Fail("NOT_FOUND", "ไม่พบงบประมาณ"));
        }

        return Ok(ApiResponse<BudgetResponse>.Ok(result));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var deleted = await _budgetService.DeleteAsync(id, userId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบงบประมาณ"));
        }

        return NoContent();
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
