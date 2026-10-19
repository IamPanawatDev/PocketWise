using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.RecurringTransactions;

public class RecurringTransactionResponse
{
    public long RecurringTransactionId { get; set; }
    public TransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public long? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public RecurringFrequency Frequency { get; set; }
    public int IntervalValue { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public DateTime NextRunAt { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
