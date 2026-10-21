using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Transactions;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Enums;

namespace PocketWise.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/imports")]
public class ImportsController : ControllerBase
{
    private readonly ISlipImportService _slipImportService;
    private readonly IStatementImportService _statementImportService;
    private readonly IImportJobService _importJobService;

    public ImportsController(
        ISlipImportService slipImportService,
        IStatementImportService statementImportService,
        IImportJobService importJobService)
    {
        _slipImportService = slipImportService;
        _statementImportService = statementImportService;
        _importJobService = importJobService;
    }

    [HttpPost("slips")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<SlipImportResponse>>> UploadSlipAsync(
        IFormFile? file,
        [FromForm] string? bankCode,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<SlipImportResponse>.Fail("VALIDATION_ERROR", "กรุณาเลือกไฟล์สลิปที่ต้องการอัปโหลด"));
        }

        var userId = GetUserId();
        using var stream = file.OpenReadStream();

        var result = await _slipImportService.UploadSlipAsync(
            userId,
            stream,
            file.FileName,
            file.ContentType,
            file.Length,
            bankCode,
            cancellationToken);

        return Ok(ApiResponse<SlipImportResponse>.Ok(result));
    }

    [HttpGet("slips/{id:long}")]
    public async Task<ActionResult<ApiResponse<SlipImportResponse>>> GetSlipByIdAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _slipImportService.GetSlipByIdAsync(userId, id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<SlipImportResponse>.Fail("NOT_FOUND", "ไม่พบสลิปที่ระบุ"));
        }

        return Ok(ApiResponse<SlipImportResponse>.Ok(result));
    }

    [HttpGet("slips/{id:long}/image")]
    public async Task<IActionResult> GetSlipImageAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var fileData = await _slipImportService.GetSlipFileStreamAsync(userId, id, cancellationToken);
        if (fileData == null)
        {
            return NotFound();
        }

        return File(fileData.Value.Stream, fileData.Value.ContentType, fileData.Value.FileName);
    }

    [HttpPost("slips/{id:long}/confirm")]
    public async Task<ActionResult<ApiResponse<TransactionResponse>>> ConfirmSlipAsync(
        long id,
        [FromBody] ConfirmSlipRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _slipImportService.ConfirmSlipAsync(userId, id, request, cancellationToken);
        return Ok(ApiResponse<TransactionResponse>.Ok(result));
    }

    [HttpPost("slips/{id:long}/reject")]
    public async Task<ActionResult<ApiResponse<object?>>> RejectSlipAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var success = await _slipImportService.RejectSlipAsync(userId, id, cancellationToken);
        if (!success)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบสลิปที่ระบุ"));
        }

        return Ok(ApiResponse<object?>.Ok(new { rejected = true }));
    }

    [HttpPost("credit-card-statements")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<CreditCardStatementImportResponse>>> ImportStatementAsync(
        IFormFile? file,
        [FromForm] long creditCardId,
        [FromForm] string? format,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<CreditCardStatementImportResponse>.Fail("VALIDATION_ERROR", "กรุณาเลือกไฟล์ใบแจ้งยอดที่ต้องการนำเข้า"));
        }

        var userId = GetUserId();
        using var stream = file.OpenReadStream();

        var result = await _statementImportService.ImportStatementAsync(
            userId,
            creditCardId,
            stream,
            file.FileName,
            format,
            cancellationToken);

        return Ok(ApiResponse<CreditCardStatementImportResponse>.Ok(result));
    }

    [HttpGet("jobs")]
    public async Task<ActionResult<ApiResponse<PagedResult<ImportJobResponse>>>> GetJobsAsync(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? type = null,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        ImportType? importType = null;
        if (!string.IsNullOrWhiteSpace(type))
        {
            if (Enum.TryParse<ImportType>(type, true, out var parsed))
            {
                importType = parsed;
            }
        }

        var result = await _importJobService.GetJobsAsync(userId, page, pageSize, importType, cancellationToken);
        return Ok(ApiResponse<PagedResult<ImportJobResponse>>.Ok(result));
    }

    [HttpGet("jobs/{id:long}")]
    public async Task<ActionResult<ApiResponse<ImportJobResponse>>> GetJobByIdAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _importJobService.GetJobByIdAsync(userId, id, cancellationToken);
        if (result == null)
        {
            return NotFound(ApiResponse<ImportJobResponse>.Fail("NOT_FOUND", "ไม่พบงานนำเข้าที่ระบุ"));
        }

        return Ok(ApiResponse<ImportJobResponse>.Ok(result));
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
