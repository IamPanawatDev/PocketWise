namespace PocketWise.Application.DTOs.Categories;

public class ReorderCategoriesRequest
{
    public IReadOnlyList<CategoryOrderItem> Items { get; set; } = [];
}

public class CategoryOrderItem
{
    public long CategoryId { get; set; }
    public int SortOrder { get; set; }
}
