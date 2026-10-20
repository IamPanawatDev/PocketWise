namespace PocketWise.Application.Features.Imports.DTOs;

public class BatchConfirmStatementItemsResponse
{
    public long StatementId { get; set; }
    public int ConfirmedCount { get; set; }
    public List<long> CreatedTransactionIds { get; set; } = [];
}
