namespace PocketWise.Application.DTOs.Transactions;

public class BulkDeleteTransactionsRequest
{
    public IReadOnlyList<long> TransactionIds { get; set; } = [];
}
