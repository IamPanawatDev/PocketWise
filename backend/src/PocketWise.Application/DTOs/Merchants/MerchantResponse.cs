namespace PocketWise.Application.DTOs.Merchants;

public class MerchantResponse
{
    public long MerchantId { get; set; }
    public string MerchantName { get; set; } = string.Empty;
    public long? DefaultCategoryId { get; set; }
    public string? DefaultCategoryName { get; set; }
    public string? BankOrProvider { get; set; }
    public bool IsVerified { get; set; }
    public DateTime CreatedAt { get; set; }
}
