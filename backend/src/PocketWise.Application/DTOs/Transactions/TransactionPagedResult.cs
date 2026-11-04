namespace PocketWise.Application.DTOs.Transactions;

public class TransactionPagedResult<T> : PagedResult<T>
{
    public decimal TotalIncome { get; init; }
    public decimal TotalExpense { get; init; }
    public decimal NetBalance => TotalIncome - TotalExpense;

    public TransactionPagedResult() { }

    public TransactionPagedResult(
        IReadOnlyList<T> items,
        int page,
        int pageSize,
        int totalItems,
        decimal totalIncome,
        decimal totalExpense)
        : base(items, page, pageSize, totalItems)
    {
        TotalIncome = totalIncome;
        TotalExpense = totalExpense;
    }
}
