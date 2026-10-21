using PocketWise.Domain.Enums;

namespace PocketWise.Application.DTOs.Categories;

public class UpdateCategoryRequest
{
    public string CategoryName { get; set; } = string.Empty;
    public CategoryType CategoryType { get; set; }
    public string? Icon { get; set; }
    public string? Color { get; set; }
    public bool IsActive { get; set; } = true;
}
