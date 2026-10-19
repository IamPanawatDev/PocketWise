using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Transfers;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/transfers")]
[Authorize]
public class TransfersController : ControllerBase
{
    private readonly ITransferService _transferService;

    public TransfersController(ITransferService transferService)
    {
        _transferService = transferService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<TransferResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _transferService.GetAllAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<TransferResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<TransferResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _transferService.GetByIdAsync(id, userId, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<TransferResponse>.Fail("NOT_FOUND", "ไม่พบรายการโอน"));
        }

        return Ok(ApiResponse<TransferResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TransferResponse>>> CreateAsync([FromBody] CreateTransferRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _transferService.CreateAsync(userId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<TransferResponse>.Ok(result));
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
