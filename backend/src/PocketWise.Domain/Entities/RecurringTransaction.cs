using PocketWise.Domain.Enums;

namespace PocketWise.Domain.Entities;

public class RecurringTransaction
{
    public long RecurringTransactionId { get; set; }
    public long UserId { get; set; }
    public TransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public long? CategoryId { get; set; }
    public RecurringFrequency Frequency { get; set; }
    public int IntervalValue { get; set; } = 1;
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public DateTime NextRunAt { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Category? Category { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = [];
}
