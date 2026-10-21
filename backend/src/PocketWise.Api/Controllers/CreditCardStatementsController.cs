using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/credit-cards")]
public class CreditCardStatementsController : ControllerBase
{
    private readonly IStatementImportService _statementImportService;

    public CreditCardStatementsController(IStatementImportService statementImportService)
    {
        _statementImportService = statementImportService;
    }

    [HttpGet("{cardId:long}/statements")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CreditCardStatementImportResponse>>>> GetStatementsByCardIdAsync(
        long cardId,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _statementImportService.GetStatementsByCardIdAsync(userId, cardId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CreditCardStatementImportResponse>>.Ok(result));
    }

    [HttpGet("statements/{statementId:long}")]
    public async Task<ActionResult<ApiResponse<CreditCardStatementImportResponse>>> GetStatementByIdAsync(
        long statementId,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _statementImportService.GetStatementByIdAsync(userId, statementId, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<CreditCardStatementImportResponse>.Fail("NOT_FOUND", "ไม่พบใบแจ้งยอดที่ระบุ"));
        }

        return Ok(ApiResponse<CreditCardStatementImportResponse>.Ok(result));
    }

    [HttpPost("statements/{statementId:long}/confirm-items")]
    public async Task<ActionResult<ApiResponse<BatchConfirmStatementItemsResponse>>> ConfirmStatementItemsAsync(
        long statementId,
        [FromBody] ConfirmStatementItemsRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _statementImportService.ConfirmStatementItemsAsync(userId, statementId, request, cancellationToken);
        return Ok(ApiResponse<BatchConfirmStatementItemsResponse>.Ok(result));
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
