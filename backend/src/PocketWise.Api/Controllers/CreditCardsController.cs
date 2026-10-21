using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.CreditCards;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/credit-cards")]
[Authorize]
public class CreditCardsController : ControllerBase
{
    private readonly ICreditCardService _creditCardService;

    public CreditCardsController(ICreditCardService creditCardService)
    {
        _creditCardService = creditCardService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CreditCardResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _creditCardService.GetAllAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CreditCardResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<CreditCardResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _creditCardService.GetByIdAsync(id, userId, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<CreditCardResponse>.Fail("NOT_FOUND", "ไม่พบบัตรเครดิต"));
        }

        return Ok(ApiResponse<CreditCardResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CreditCardResponse>>> CreateAsync([FromBody] CreateCreditCardRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _creditCardService.CreateAsync(userId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<CreditCardResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<CreditCardResponse>>> UpdateAsync(long id, [FromBody] UpdateCreditCardRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _creditCardService.UpdateAsync(id, userId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<CreditCardResponse>.Fail("NOT_FOUND", "ไม่พบบัตรเครดิต"));
        }

        return Ok(ApiResponse<CreditCardResponse>.Ok(result));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var deleted = await _creditCardService.DeleteAsync(id, userId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบบัตรเครดิต"));
        }

        return NoContent();
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
