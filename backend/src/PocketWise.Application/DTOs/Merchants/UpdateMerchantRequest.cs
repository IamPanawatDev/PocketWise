namespace PocketWise.Application.DTOs.Merchants;

public class UpdateMerchantRequest
{
    public string MerchantName { get; set; } = string.Empty;
    public long? DefaultCategoryId { get; set; }
    public string? BankOrProvider { get; set; }
    public bool IsVerified { get; set; }
}
