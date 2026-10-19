namespace PocketWise.Application.DTOs.Tags;

public class ReorderTagsRequest
{
    public IReadOnlyList<TagOrderItem> Items { get; set; } = [];
}

public class TagOrderItem
{
    public long TagId { get; set; }
    public int SortOrder { get; set; }
}
