namespace PocketWise.Application.Features.Imports.DTOs;

public class SlipExtractedData
{
    public string? BankCode { get; set; }
    public string? PayerName { get; set; }
    public string? PayeeName { get; set; }
    public decimal? DetectedAmount { get; set; }
    public DateTime? DetectedAt { get; set; }
    public string? TransactionReference { get; set; }
    public string? RawText { get; set; }
}
