using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Merchants;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/merchants")]
[Authorize]
public class MerchantsController : ControllerBase
{
    private readonly IMerchantService _merchantService;

    public MerchantsController(IMerchantService merchantService)
    {
        _merchantService = merchantService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<MerchantResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var result = await _merchantService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<MerchantResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<MerchantResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var result = await _merchantService.GetByIdAsync(id, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<MerchantResponse>.Fail("NOT_FOUND", "ไม่พบร้านค้า"));
        }

        return Ok(ApiResponse<MerchantResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<MerchantResponse>>> CreateAsync([FromBody] CreateMerchantRequest request, CancellationToken cancellationToken)
    {
        var actorUserId = GetUserId();
        var result = await _merchantService.CreateAsync(actorUserId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<MerchantResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<MerchantResponse>>> UpdateAsync(long id, [FromBody] UpdateMerchantRequest request, CancellationToken cancellationToken)
    {
        var actorUserId = GetUserId();
        var result = await _merchantService.UpdateAsync(id, actorUserId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<MerchantResponse>.Fail("NOT_FOUND", "ไม่พบร้านค้า"));
        }

        return Ok(ApiResponse<MerchantResponse>.Ok(result));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var actorUserId = GetUserId();
        var deleted = await _merchantService.DeleteAsync(id, actorUserId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบร้านค้า"));
        }

        return NoContent();
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
