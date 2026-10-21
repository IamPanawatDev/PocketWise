using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.BankAccounts;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/bank-accounts")]
[Authorize]
public class BankAccountsController : ControllerBase
{
    private readonly IBankAccountService _bankAccountService;

    public BankAccountsController(IBankAccountService bankAccountService)
    {
        _bankAccountService = bankAccountService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BankAccountResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _bankAccountService.GetAllAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<BankAccountResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<BankAccountResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _bankAccountService.GetByIdAsync(id, userId, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<BankAccountResponse>.Fail("NOT_FOUND", "ไม่พบบัญชี"));
        }

        return Ok(ApiResponse<BankAccountResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<BankAccountResponse>>> CreateAsync([FromBody] CreateBankAccountRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _bankAccountService.CreateAsync(userId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<BankAccountResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<BankAccountResponse>>> UpdateAsync(long id, [FromBody] UpdateBankAccountRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _bankAccountService.UpdateAsync(id, userId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<BankAccountResponse>.Fail("NOT_FOUND", "ไม่พบบัญชี"));
        }

        return Ok(ApiResponse<BankAccountResponse>.Ok(result));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var deleted = await _bankAccountService.DeleteAsync(id, userId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบบัญชี"));
        }

        return NoContent();
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
