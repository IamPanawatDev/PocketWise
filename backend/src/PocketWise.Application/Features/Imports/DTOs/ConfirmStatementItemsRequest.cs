namespace PocketWise.Application.Features.Imports.DTOs;

public class ConfirmStatementItemDto
{
    public long StatementItemId { get; set; }
    public long? CategoryId { get; set; }
    public string? Description { get; set; }
}

public class ConfirmStatementItemsRequest
{
    public List<ConfirmStatementItemDto> Items { get; set; } = [];
}
