using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.RecurringTransactions;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/recurring-transactions")]
[Authorize]
public class RecurringTransactionsController : ControllerBase
{
    private readonly IRecurringTransactionService _recurringTransactionService;

    public RecurringTransactionsController(IRecurringTransactionService recurringTransactionService)
    {
        _recurringTransactionService = recurringTransactionService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RecurringTransactionResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _recurringTransactionService.GetAllAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RecurringTransactionResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<RecurringTransactionResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _recurringTransactionService.GetByIdAsync(id, userId, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<RecurringTransactionResponse>.Fail("NOT_FOUND", "ไม่พบรายการประจำ"));
        }

        return Ok(ApiResponse<RecurringTransactionResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<RecurringTransactionResponse>>> CreateAsync([FromBody] CreateRecurringTransactionRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _recurringTransactionService.CreateAsync(userId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<RecurringTransactionResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<RecurringTransactionResponse>>> UpdateAsync(long id, [FromBody] UpdateRecurringTransactionRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _recurringTransactionService.UpdateAsync(id, userId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<RecurringTransactionResponse>.Fail("NOT_FOUND", "ไม่พบรายการประจำ"));
        }

        return Ok(ApiResponse<RecurringTransactionResponse>.Ok(result));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var deleted = await _recurringTransactionService.DeleteAsync(id, userId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบรายการประจำ"));
        }

        return NoContent();
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
