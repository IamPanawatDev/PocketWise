namespace PocketWise.Application.Features.Imports.DTOs;

public class StatementItemResponse
{
    public long StatementItemId { get; set; }
    public DateOnly TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string ItemType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? ExternalReference { get; set; }
    public bool IsDuplicate { get; set; }
    public bool IsLinked { get; set; }
    public long? TransactionId { get; set; }
    public long? SuggestedCategoryId { get; set; }
    public string? SuggestedCategoryName { get; set; }
}
