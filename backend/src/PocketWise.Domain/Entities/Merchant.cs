namespace PocketWise.Domain.Entities;

public class Merchant
{
    public long MerchantId { get; set; }
    public string MerchantName { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public long? DefaultCategoryId { get; set; }
    public string? BankOrProvider { get; set; }
    public bool IsVerified { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Category? DefaultCategory { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<SlipImportFile> SlipImportFiles { get; set; } = [];
    public ICollection<InstallmentPlan> InstallmentPlans { get; set; } = [];
    public ICollection<CreditCardStatementItem> CreditCardStatementItems { get; set; } = [];
}
