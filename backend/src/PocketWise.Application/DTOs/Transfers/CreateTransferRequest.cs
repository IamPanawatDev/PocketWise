namespace PocketWise.Application.DTOs.Transfers;

public class CreateTransferRequest
{
    public long FromBankAccountId { get; set; }
    public long ToBankAccountId { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransferDate { get; set; }
    public string? Reference { get; set; }
}
