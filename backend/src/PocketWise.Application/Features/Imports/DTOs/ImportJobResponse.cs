namespace PocketWise.Application.Features.Imports.DTOs;

public class ImportJobResponse
{
    public long ImportJobId { get; set; }
    public string ImportType { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public string Status { get; set; } = string.Empty;
    public int TotalRecords { get; set; }
    public int ImportedRecords { get; set; }
    public int DuplicateRecords { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
