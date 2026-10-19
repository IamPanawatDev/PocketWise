namespace PocketWise.Application.DTOs.Tags;

public class CreateTagRequest
{
    public string TagName { get; set; } = string.Empty;
    public string? Color { get; set; }
}
