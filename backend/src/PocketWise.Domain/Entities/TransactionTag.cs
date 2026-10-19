namespace PocketWise.Domain.Entities;

public class TransactionTag
{
    public long TransactionId { get; set; }
    public long TagId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Transaction Transaction { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
