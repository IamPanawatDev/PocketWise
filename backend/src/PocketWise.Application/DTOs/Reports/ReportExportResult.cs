namespace PocketWise.Application.DTOs.Reports;

public sealed class ReportExportResult
{
    public byte[] Content { get; init; } = [];
    public string ContentType { get; init; } = string.Empty;
    public string FileName { get; init; } = string.Empty;
}
