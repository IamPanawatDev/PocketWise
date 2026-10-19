using PocketWise.Application.DTOs.Reports;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Reports;

public sealed class ReportService : IReportService
{
    private static readonly TimeZoneInfo BangkokTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok");

    private readonly IReportRepository _repository;

    public ReportService(IReportRepository repository)
    {
        _repository = repository;
    }

    public async Task<ReportSummaryResponse> GetSummaryAsync(
        long userId,
        DateTimeOffset fromDate,
        DateTimeOffset toDate,
        long? categoryId,
        long? tagId,
        CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        var transactions = await _repository.GetTransactionsAsync(
            userId,
            fromDate.UtcDateTime,
            toDate.UtcDateTime,
            categoryId,
            tagId,
            cancellationToken);

        return new ReportSummaryResponse
        {
            FromDate = fromDate.ToUniversalTime(),
            ToDate = toDate.ToUniversalTime(),
            Currencies = transactions
                .GroupBy(transaction => transaction.CurrencyCode, StringComparer.OrdinalIgnoreCase)
                .OrderBy(group => group.Key)
                .Select(CreateCurrencySummary)
                .ToList()
        };
    }

    public async Task<ReportTrendResponse> GetTrendsAsync(
        long userId,
        DateTimeOffset fromDate,
        DateTimeOffset toDate,
        string period,
        long? categoryId,
        long? tagId,
        CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        if (!Enum.TryParse<ReportPeriod>(period, true, out var parsedPeriod))
        {
            throw new BusinessException("VALIDATION_ERROR", "period ต้องเป็น weekly, monthly, quarterly หรือ yearly");
        }

        var transactions = await _repository.GetTransactionsAsync(
            userId,
            fromDate.UtcDateTime,
            toDate.UtcDateTime,
            categoryId,
            tagId,
            cancellationToken);

        var transactionBuckets = transactions
            .GroupBy(transaction => (
                transaction.CurrencyCode,
                PeriodStart: GetPeriodStart(ToBangkokDate(transaction.TransactionDate), parsedPeriod)))
            .ToDictionary(group => group.Key, group => group.ToList());
        var currencies = transactions
            .Select(transaction => transaction.CurrencyCode)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(code => code, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var firstPeriod = GetPeriodStart(ToBangkokDate(fromDate.UtcDateTime), parsedPeriod);
        var lastPeriod = GetPeriodStart(ToBangkokDate(toDate.UtcDateTime), parsedPeriod);
        var points = new List<ReportTrendPoint>();

        for (var start = firstPeriod; start <= lastPeriod; start = GetNextPeriodStart(start, parsedPeriod))
        {
            var end = GetNextPeriodStart(start, parsedPeriod).AddDays(-1);
            foreach (var currency in currencies)
            {
                transactionBuckets.TryGetValue((currency, start), out var bucket);
                var income = bucket?
                    .Where(transaction => transaction.TransactionType == TransactionType.Income)
                    .Sum(transaction => transaction.Amount) ?? 0m;
                var expense = bucket?
                    .Where(transaction => transaction.TransactionType == TransactionType.Expense)
                    .Sum(transaction => transaction.Amount) ?? 0m;

                points.Add(new ReportTrendPoint
                {
                    PeriodStart = start,
                    PeriodEnd = end,
                    CurrencyCode = currency,
                    Income = income,
                    Expense = expense,
                    NetAmount = income - expense
                });
            }
        }

        return new ReportTrendResponse
        {
            Period = parsedPeriod.ToString().ToLowerInvariant(),
            FromDate = fromDate.ToUniversalTime(),
            ToDate = toDate.ToUniversalTime(),
            Series = points
        };
    }

    private static ReportCurrencySummary CreateCurrencySummary(
        IGrouping<string, ReportTransactionRecord> transactions)
    {
        var income = transactions
            .Where(transaction => transaction.TransactionType == TransactionType.Income)
            .Sum(transaction => transaction.Amount);
        var expenses = transactions
            .Where(transaction => transaction.TransactionType == TransactionType.Expense)
            .ToList();
        var totalExpense = expenses.Sum(transaction => transaction.Amount);

        return new ReportCurrencySummary
        {
            CurrencyCode = transactions.Key,
            TotalIncome = income,
            TotalExpense = totalExpense,
            NetAmount = income - totalExpense,
            CategoryBreakdown = expenses
                .GroupBy(transaction => new { transaction.CategoryId, transaction.CategoryName })
                .Select(group => new ReportCategoryBreakdown
                {
                    CategoryId = group.Key.CategoryId,
                    CategoryName = group.Key.CategoryName ?? "ไม่ระบุหมวดหมู่",
                    Amount = group.Sum(transaction => transaction.Amount),
                    Percentage = CalculatePercentage(group.Sum(transaction => transaction.Amount), totalExpense)
                })
                .OrderByDescending(item => item.Amount)
                .ToList(),
            SourceBreakdown = expenses
                .GroupBy(transaction => transaction.SourceType)
                .Select(group => new ReportSourceBreakdown
                {
                    SourceType = ToCamelCase(group.Key.ToString()),
                    Amount = group.Sum(transaction => transaction.Amount),
                    Percentage = CalculatePercentage(group.Sum(transaction => transaction.Amount), totalExpense)
                })
                .OrderByDescending(item => item.Amount)
                .ToList(),
            BankAccountBreakdown = expenses
                .GroupBy(transaction => new
                {
                    transaction.BankAccountId,
                    transaction.AccountName,
                    transaction.BankName
                })
                .Select(group => new ReportBankAccountBreakdown
                {
                    BankAccountId = group.Key.BankAccountId,
                    AccountName = group.Key.AccountName ?? "ไม่ระบุบัญชี",
                    BankName = group.Key.BankName,
                    Amount = group.Sum(transaction => transaction.Amount),
                    Percentage = CalculatePercentage(group.Sum(transaction => transaction.Amount), totalExpense)
                })
                .OrderByDescending(item => item.Amount)
                .ToList(),
            CreditCardBreakdown = expenses
                .GroupBy(transaction => new
                {
                    transaction.CreditCardId,
                    transaction.CardName,
                    transaction.CreditCardBankName
                })
                .Select(group => new ReportCreditCardBreakdown
                {
                    CreditCardId = group.Key.CreditCardId,
                    CardName = group.Key.CardName ?? "ไม่ระบุบัตร",
                    BankName = group.Key.CreditCardBankName,
                    Amount = group.Sum(transaction => transaction.Amount),
                    Percentage = CalculatePercentage(group.Sum(transaction => transaction.Amount), totalExpense)
                })
                .OrderByDescending(item => item.Amount)
                .ToList()
        };
    }

    private static void ValidateRange(DateTimeOffset fromDate, DateTimeOffset toDate)
    {
        if (fromDate > toDate)
        {
            throw new BusinessException("VALIDATION_ERROR", "fromDate ต้องไม่เกิน toDate");
        }
    }

    private static decimal CalculatePercentage(decimal amount, decimal total)
    {
        return total == 0m ? 0m : Math.Round(amount / total * 100m, 2);
    }

    private static DateOnly ToBangkokDate(DateTime utcDateTime)
    {
        var utc = DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utc, BangkokTimeZone));
    }

    private static DateOnly GetPeriodStart(DateOnly date, ReportPeriod period)
    {
        return period switch
        {
            ReportPeriod.Weekly => date.AddDays(-(int)date.DayOfWeek),
            ReportPeriod.Monthly => new DateOnly(date.Year, date.Month, 1),
            ReportPeriod.Quarterly => new DateOnly(date.Year, ((date.Month - 1) / 3 * 3) + 1, 1),
            ReportPeriod.Yearly => new DateOnly(date.Year, 1, 1),
            _ => throw new ArgumentOutOfRangeException(nameof(period), period, null)
        };
    }

    private static DateOnly GetNextPeriodStart(DateOnly date, ReportPeriod period)
    {
        return period switch
        {
            ReportPeriod.Weekly => date.AddDays(7),
            ReportPeriod.Monthly => date.AddMonths(1),
            ReportPeriod.Quarterly => date.AddMonths(3),
            ReportPeriod.Yearly => date.AddYears(1),
            _ => throw new ArgumentOutOfRangeException(nameof(period), period, null)
        };
    }

    private static string ToCamelCase(string value)
    {
        return value.Length == 0
            ? value
            : char.ToLowerInvariant(value[0]) + value[1..];
    }

    private enum ReportPeriod
    {
        Weekly,
        Monthly,
        Quarterly,
        Yearly
    }
}
