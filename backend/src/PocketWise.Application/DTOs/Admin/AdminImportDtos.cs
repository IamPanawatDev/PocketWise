namespace PocketWise.Application.DTOs.Admin;

public class AdminImportJobListResponse
{
    public long ImportJobId { get; set; }
    public long UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? UserDisplayName { get; set; }
    public string JobType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int TotalRecords { get; set; }
    public int SuccessRecords { get; set; }
    public int FailedRecords { get; set; }
    public int RetryCount { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class AdminImportJobFilterRequest
{
    public string? Status { get; set; }
    public string? JobType { get; set; }
    public long? UserId { get; set; }
    public string? Q { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
