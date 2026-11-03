namespace PocketWise.Domain.Entities;

public class RecurringTransactionTag
{
    public long RecurringTransactionId { get; set; }
    public long TagId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public RecurringTransaction RecurringTransaction { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
