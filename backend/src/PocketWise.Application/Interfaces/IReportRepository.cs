using PocketWise.Application.DTOs.Reports;

namespace PocketWise.Application.Interfaces;

public interface IReportRepository
{
    Task<IReadOnlyList<ReportTransactionRecord>> GetTransactionsAsync(
        long userId,
        DateTime fromUtc,
        DateTime toUtc,
        long? categoryId,
        long? tagId,
        CancellationToken cancellationToken = default);
}
