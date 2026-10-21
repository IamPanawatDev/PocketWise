using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Transactions;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/transactions")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;

    public TransactionsController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<TransactionResponse>>>> GetAllAsync(
        [FromQuery] long? categoryId,
        [FromQuery] long? tagId,
        [FromQuery] long? bankAccountId,
        [FromQuery] string? type,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "transactionDate",
        [FromQuery] bool sortDesc = true,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        var filter = new TransactionFilter
        {
            CategoryId = categoryId,
            TagId = tagId,
            BankAccountId = bankAccountId,
            Type = type,
            FromDate = fromDate,
            ToDate = toDate,
            Q = q
        };

        var result = await _transactionService.GetPagedAsync(userId, filter, page, pageSize, sortBy, sortDesc, cancellationToken);
        return Ok(ApiResponse<PagedResult<TransactionResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<TransactionResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _transactionService.GetByIdAsync(id, userId, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<TransactionResponse>.Fail("NOT_FOUND", "ไม่พบรายการ"));
        }

        return Ok(ApiResponse<TransactionResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TransactionResponse>>> CreateAsync([FromBody] CreateTransactionRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _transactionService.CreateAsync(userId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<TransactionResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<TransactionResponse>>> UpdateAsync(long id, [FromBody] UpdateTransactionRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _transactionService.UpdateAsync(id, userId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<TransactionResponse>.Fail("NOT_FOUND", "ไม่พบรายการ"));
        }

        return Ok(ApiResponse<TransactionResponse>.Ok(result));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var deleted = await _transactionService.DeleteAsync(id, userId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบรายการ"));
        }

        return NoContent();
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
