using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class ImportJob
{
    public long ImportJobId { get; set; }
    public long UserId { get; set; }
    public ImportType ImportType { get; set; }
    public string? FileName { get; set; }
    public ImportJobStatus Status { get; set; } = ImportJobStatus.Pending;
    public int TotalRecords { get; set; }
    public int ImportedRecords { get; set; }
    public int DuplicateRecords { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<SlipImportFile> SlipImportFiles { get; set; } = [];
    public ICollection<CreditCardStatement> CreditCardStatements { get; set; } = [];
}
