using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class SlipImportFile
{
    public long SlipImportFileId { get; set; }
    public long UserId { get; set; }
    public long? ImportJobId { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? BankCode { get; set; }
    public string? PayerName { get; set; }
    public string? PayeeName { get; set; }
    public decimal? DetectedAmount { get; set; }
    public DateTime? DetectedAt { get; set; }
    public string? TransactionReference { get; set; }
    public string? FileHash { get; set; }
    public ReviewStatus ReviewStatus { get; set; } = ReviewStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public ImportJob? ImportJob { get; set; }
    public Transaction? Transaction { get; set; }
    public Merchant? Merchant { get; set; }
}
