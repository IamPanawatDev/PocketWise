namespace PocketWise.Application.Features.Imports.DTOs;

public class SlipImportResponse
{
    public long SlipImportFileId { get; set; }
    public long? ImportJobId { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? FileHash { get; set; }
    public string? BankCode { get; set; }
    public string? PayerName { get; set; }
    public string? PayeeName { get; set; }
    public decimal? DetectedAmount { get; set; }
    public DateTime? DetectedAt { get; set; }
    public string? TransactionReference { get; set; }
    public string ReviewStatus { get; set; } = string.Empty;
    public bool IsDuplicate { get; set; }
    public long? SuggestedCategoryId { get; set; }
    public string? SuggestedCategoryName { get; set; }
    public DateTime CreatedAt { get; set; }
}
