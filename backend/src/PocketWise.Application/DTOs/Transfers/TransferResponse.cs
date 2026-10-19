using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.Transfers;

public class TransferResponse
{
    public long TransferGroupId { get; set; }
    public long FromBankAccountId { get; set; }
    public long ToBankAccountId { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransferDate { get; set; }
    public string? Reference { get; set; }
    public TransferGroupStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}
