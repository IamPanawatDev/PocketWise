namespace PocketWise.Application.DTOs.Tags;

public class TagResponse
{
    public long TagId { get; set; }
    public string TagName { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}
