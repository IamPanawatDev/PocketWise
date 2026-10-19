using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.RecurringTransactions;

public class CreateRecurringTransactionRequest
{
    public TransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public long? CategoryId { get; set; }
    public RecurringFrequency Frequency { get; set; }
    public int IntervalValue { get; set; } = 1;
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}
