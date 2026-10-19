namespace PocketWise.Application.DTOs.Merchants;

public class CreateMerchantRequest
{
    public string MerchantName { get; set; } = string.Empty;
    public long? DefaultCategoryId { get; set; }
    public string? BankOrProvider { get; set; }
}
