using PocketWise.Application.DTOs.Reports;

namespace PocketWise.Application.Interfaces;

public interface IReportService
{
    Task<ReportSummaryResponse> GetSummaryAsync(
        long userId,
        DateTimeOffset fromDate,
        DateTimeOffset toDate,
        long? categoryId,
        long? tagId,
        CancellationToken cancellationToken = default);

    Task<ReportTrendResponse> GetTrendsAsync(
        long userId,
        DateTimeOffset fromDate,
        DateTimeOffset toDate,
        string period,
        long? categoryId,
        long? tagId,
        CancellationToken cancellationToken = default);

    Task<ReportExportResult> ExportReportAsync(
        long userId,
        DateTimeOffset fromDate,
        DateTimeOffset toDate,
        string format,
        string? type,
        long? categoryId,
        long? tagId,
        CancellationToken cancellationToken = default);
}
