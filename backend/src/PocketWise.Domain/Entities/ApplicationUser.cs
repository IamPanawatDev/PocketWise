using Microsoft.AspNetCore.Identity;

namespace PocketWise.Domain.Entities;

public class ApplicationUser : IdentityUser<long>
{
    public string DisplayName { get; set; } = string.Empty;
    public DateOnly? BirthDate { get; set; }
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsSuspended { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public long? SuspendedByUserId { get; set; }
    public string? SuspensionReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ApplicationUser? SuspendedByUser { get; set; }
    public UserSettings? UserSettings { get; set; }
    public ICollection<UserRefreshToken> RefreshTokens { get; set; } = [];
    public ICollection<Category> Categories { get; set; } = [];
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<BankAccount> BankAccounts { get; set; } = [];
    public ICollection<CreditCard> CreditCards { get; set; } = [];
    public ICollection<Tag> Tags { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
    public ICollection<RecurringTransaction> RecurringTransactions { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
    public ICollection<SlipImportFile> SlipImportFiles { get; set; } = [];
    public ICollection<ImportJob> ImportJobs { get; set; } = [];
    public ICollection<CategoryRule> CategoryRules { get; set; } = [];
    public ICollection<InstallmentPlan> InstallmentPlans { get; set; } = [];
    public ICollection<TransferGroup> TransferGroups { get; set; } = [];
    public ICollection<AuditLog> AuditLogs { get; set; } = [];
}
