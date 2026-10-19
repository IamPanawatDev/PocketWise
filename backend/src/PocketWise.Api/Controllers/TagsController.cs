using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Tags;
using PocketWise.Application.Interfaces;
using System.Security.Claims;

namespace PocketWise.Api.Controllers;

[ApiController]
[Route("api/v1/tags")]
[Authorize]
public class TagsController : ControllerBase
{
    private readonly ITagService _tagService;

    public TagsController(ITagService tagService)
    {
        _tagService = tagService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<TagResponse>>>> GetAllAsync(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _tagService.GetAllAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<TagResponse>>.Ok(result));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<TagResponse>>> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _tagService.GetByIdAsync(id, userId, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<TagResponse>.Fail("NOT_FOUND", "ไม่พบแท็ก"));
        }

        return Ok(ApiResponse<TagResponse>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TagResponse>>> CreateAsync([FromBody] CreateTagRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _tagService.CreateAsync(userId, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<TagResponse>.Ok(result));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<TagResponse>>> UpdateAsync(long id, [FromBody] UpdateTagRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var result = await _tagService.UpdateAsync(id, userId, request, cancellationToken);
        if (result is null)
        {
            return NotFound(ApiResponse<TagResponse>.Fail("NOT_FOUND", "ไม่พบแท็ก"));
        }

        return Ok(ApiResponse<TagResponse>.Ok(result));
    }

    [HttpPut("reorder")]
    public async Task<ActionResult<ApiResponse<object?>>> ReorderAsync([FromBody] ReorderTagsRequest request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        await _tagService.ReorderAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeleteAsync(long id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var deleted = await _tagService.DeleteAsync(id, userId, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<object?>.Fail("NOT_FOUND", "ไม่พบแท็ก"));
        }

        return NoContent();
    }

    private long GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : 0;
    }
}
