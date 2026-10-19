using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.BankAccounts;

public class CreateBankAccountRequest
{
    public string? BankCode { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string? AccountNumberMasked { get; set; }
    public AccountType AccountType { get; set; }
}
