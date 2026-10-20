using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
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
    private readonly IAuditLogService? _auditLogService;

    public ReportService(
        IReportRepository repository,
        IAuditLogService? auditLogService = null)
    {
        _repository = repository;
        _auditLogService = auditLogService;
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

    public async Task<ReportExportResult> ExportReportAsync(
        long userId,
        DateTimeOffset fromDate,
        DateTimeOffset toDate,
        string format,
        string? type,
        long? categoryId,
        long? tagId,
        CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        var normalizedFormat = (format ?? "csv").Trim().ToLowerInvariant();
        if (normalizedFormat != "csv" && normalizedFormat != "json")
        {
            throw new BusinessException("VALIDATION_ERROR", "รูปแบบการส่งออกต้องเป็น csv หรือ json เท่านั้น");
        }

        var transactions = await _repository.GetTransactionsAsync(
            userId,
            fromDate.UtcDateTime,
            toDate.UtcDateTime,
            categoryId,
            tagId,
            cancellationToken);

        var fromBangkok = ToBangkokDate(fromDate.UtcDateTime);
        var toBangkok = ToBangkokDate(toDate.UtcDateTime);
        var fileNameBase = $"pocketwise-report-{fromBangkok:yyyyMMdd}-{toBangkok:yyyyMMdd}";

        ReportExportResult result;

        if (normalizedFormat == "json")
        {
            var currencies = transactions
                .GroupBy(transaction => transaction.CurrencyCode, StringComparer.OrdinalIgnoreCase)
                .OrderBy(group => group.Key)
                .Select(CreateCurrencySummary)
                .ToList();

            var exportPayload = new
            {
                ExportedAt = DateTime.UtcNow,
                Period = new
                {
                    From = fromDate.ToUniversalTime(),
                    To = toDate.ToUniversalTime()
                },
                Currencies = currencies,
                Transactions = transactions.Select(t => new
                {
                    t.TransactionId,
                    Date = ToBangkokDate(t.TransactionDate).ToString("yyyy-MM-dd"),
                    Time = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(t.TransactionDate, DateTimeKind.Utc), BangkokTimeZone).ToString("HH:mm:ss"),
                    Type = t.TransactionType.ToString(),
                    t.Amount,
                    t.CurrencyCode,
                    Source = t.SourceType.ToString(),
                    t.CategoryName,
                    t.MerchantName,
                    t.Description,
                    Account = t.BankAccountId.HasValue ? $"{t.BankName} - {t.AccountName}" : null,
                    Card = t.CreditCardId.HasValue ? $"{t.CreditCardBankName} - {t.CardName}" : null
                })
            };

            var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(exportPayload, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            });

            result = new ReportExportResult
            {
                Content = jsonBytes,
                ContentType = "application/json; charset=utf-8",
                FileName = $"{fileNameBase}.json"
            };
        }
        else
        {
            // Build CSV with UTF-8 BOM
            var csv = GenerateCsv(fromDate, toDate, transactions, type);
            var utf8Bytes = Encoding.UTF8.GetBytes(csv);
            var preamble = Encoding.UTF8.GetPreamble();
            var contentWithBom = new byte[preamble.Length + utf8Bytes.Length];
            Buffer.BlockCopy(preamble, 0, contentWithBom, 0, preamble.Length);
            Buffer.BlockCopy(utf8Bytes, 0, contentWithBom, preamble.Length, utf8Bytes.Length);

            result = new ReportExportResult
            {
                Content = contentWithBom,
                ContentType = "text/csv; charset=utf-8",
                FileName = $"{fileNameBase}.csv"
            };
        }

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Export,
                "Reports",
                $"{normalizedFormat}-{fromBangkok:yyyyMMdd}-{toBangkok:yyyyMMdd}",
                new
                {
                    Format = normalizedFormat,
                    Type = type ?? "full",
                    FromDate = fromDate,
                    ToDate = toDate,
                    CategoryId = categoryId,
                    TagId = tagId,
                    TransactionCount = transactions.Count
                },
                cancellationToken);
        }

        return result;
    }

    private static string GenerateCsv(
        DateTimeOffset fromDate,
        DateTimeOffset toDate,
        IReadOnlyList<ReportTransactionRecord> transactions,
        string? type)
    {
        var sb = new StringBuilder();
        var fromBkk = ToBangkokDate(fromDate.UtcDateTime);
        var toBkk = ToBangkokDate(toDate.UtcDateTime);
        var generatedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BangkokTimeZone);

        var isTransactionsOnly = string.Equals(type, "transactions", StringComparison.OrdinalIgnoreCase);

        // Header info
        sb.AppendLine("# PocketWise Financial Report (รายงานการเงิน PocketWise)");
        sb.AppendLine($"# ช่วงวันที่รายงาน: {fromBkk:yyyy-MM-dd} ถึง {toBkk:yyyy-MM-dd}");
        sb.AppendLine($"# วันเวลาที่สร้างรายงาน: {generatedAt:yyyy-MM-dd HH:mm:ss} (เวลาประเทศไทย)");
        sb.AppendLine($"# จำนวนรายการทั้งหมด: {transactions.Count} รายการ");
        sb.AppendLine();

        if (!isTransactionsOnly)
        {
            var currencySummaries = transactions
                .GroupBy(t => t.CurrencyCode, StringComparer.OrdinalIgnoreCase)
                .OrderBy(g => g.Key)
                .Select(CreateCurrencySummary)
                .ToList();

            // 1. Currency Summary
            sb.AppendLine("=== 1. สรุปภาพรวมทางการเงิน (Financial Summary) ===");
            sb.AppendLine("สกุลเงิน,รายรับรวม,รายจ่ายรวม,ยอดคงเหลือสุทธิ,รายจ่ายจากสลิปโอนเงิน (Slip),รายจ่ายจากบัตรเครดิต (Credit Card)");
            foreach (var c in currencySummaries)
            {
                sb.AppendLine($"{EscapeCsv(c.CurrencyCode)},{c.TotalIncome:F2},{c.TotalExpense:F2},{c.NetAmount:F2},{c.TotalSlipExpense:F2},{c.TotalCreditCardExpense:F2}");
            }
            sb.AppendLine();

            // 2. Category Breakdown
            sb.AppendLine("=== 2. สัดส่วนรายจ่ายตามหมวดหมู่ (Expense Breakdown by Category) ===");
            sb.AppendLine("สกุลเงิน,หมวดหมู่,ยอดเงิน,สัดส่วน (%),จำนวนรายการ");
            foreach (var c in currencySummaries)
            {
                foreach (var cat in c.CategoryBreakdown)
                {
                    sb.AppendLine($"{EscapeCsv(c.CurrencyCode)},{EscapeCsv(cat.CategoryName)},{cat.Amount:F2},{cat.Percentage:F2}%,{cat.TransactionCount}");
                }
            }
            sb.AppendLine();

            // 3. Source Breakdown
            sb.AppendLine("=== 3. สัดส่วนตามช่องทาง (Breakdown by Source) ===");
            sb.AppendLine("สกุลเงิน,ช่องทาง,ยอดเงิน,สัดส่วน (%),จำนวนรายการ");
            foreach (var c in currencySummaries)
            {
                foreach (var src in c.SourceBreakdown)
                {
                    var sourceDisplay = src.SourceType.ToLowerInvariant() switch
                    {
                        "slip" => "สลิปโอนเงิน (Slip)",
                        "cardstatement" => "ใบแจ้งยอดบัตร (Card Statement)",
                        "manual" => "บันทึกเอง (Manual)",
                        "recurring" => "รายการประจำ (Recurring)",
                        _ => src.SourceType
                    };
                    sb.AppendLine($"{EscapeCsv(c.CurrencyCode)},{EscapeCsv(sourceDisplay)},{src.Amount:F2},{src.Percentage:F2}%,{src.TransactionCount}");
                }
            }
            sb.AppendLine();
        }

        // 4. Transaction Details
        sb.AppendLine("=== 4. รายการธุรกรรมทั้งหมด (Transaction Records) ===");
        sb.AppendLine("ลำดับ,วันที่,เวลา,ประเภท,หมวดหมู่,ร้านค้า/ผู้รับ,คำอธิบาย,จำนวนเงิน,สกุลเงิน,ช่องทาง,บัญชี/บัตร");

        var index = 1;
        foreach (var t in transactions)
        {
            var localDt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(t.TransactionDate, DateTimeKind.Utc), BangkokTimeZone);
            var typeName = t.TransactionType == TransactionType.Income ? "รายรับ" : "รายจ่าย";
            var sourceName = t.SourceType switch
            {
                SourceType.Slip => "สลิปโอนเงิน",
                SourceType.CardStatement => "ใบแจ้งยอดบัตร",
                SourceType.Manual => "บันทึกเอง",
                SourceType.Recurring => "รายการประจำ",
                _ => t.SourceType.ToString()
            };

            var accountOrCard = t.BankAccountId.HasValue
                ? $"{t.BankName} - {t.AccountName}"
                : t.CreditCardId.HasValue
                    ? $"{t.CreditCardBankName} - {t.CardName}"
                    : "-";

            sb.AppendLine(string.Join(",",
                index++,
                localDt.ToString("yyyy-MM-dd"),
                localDt.ToString("HH:mm"),
                EscapeCsv(typeName),
                EscapeCsv(t.CategoryName ?? "ไม่ระบุหมวดหมู่"),
                EscapeCsv(t.MerchantName ?? "-"),
                EscapeCsv(t.Description ?? "-"),
                t.Amount.ToString("F2"),
                EscapeCsv(t.CurrencyCode),
                EscapeCsv(sourceName),
                EscapeCsv(accountOrCard)
            ));
        }

        return sb.ToString();
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
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

        var totalSlipExpense = expenses
            .Where(transaction => transaction.SourceType == SourceType.Slip)
            .Sum(transaction => transaction.Amount);

        var totalCreditCardExpense = expenses
            .Where(transaction => transaction.CreditCardId.HasValue || transaction.SourceType == SourceType.CardStatement)
            .Sum(transaction => transaction.Amount);

        return new ReportCurrencySummary
        {
            CurrencyCode = transactions.Key,
            TotalIncome = income,
            TotalExpense = totalExpense,
            NetAmount = income - totalExpense,
            TotalSlipExpense = totalSlipExpense,
            TotalCreditCardExpense = totalCreditCardExpense,
            CategoryBreakdown = expenses
                .GroupBy(transaction => new { transaction.CategoryId, transaction.CategoryName })
                .Select(group => new ReportCategoryBreakdown
                {
                    CategoryId = group.Key.CategoryId,
                    CategoryName = group.Key.CategoryName ?? "ไม่ระบุหมวดหมู่",
                    Amount = group.Sum(transaction => transaction.Amount),
                    Percentage = CalculatePercentage(group.Sum(transaction => transaction.Amount), totalExpense),
                    TransactionCount = group.Count()
                })
                .OrderByDescending(item => item.Amount)
                .ToList(),
            SourceBreakdown = expenses
                .GroupBy(transaction => transaction.SourceType)
                .Select(group => new ReportSourceBreakdown
                {
                    SourceType = ToCamelCase(group.Key.ToString()),
                    Amount = group.Sum(transaction => transaction.Amount),
                    Percentage = CalculatePercentage(group.Sum(transaction => transaction.Amount), totalExpense),
                    TransactionCount = group.Count()
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
                    Percentage = CalculatePercentage(group.Sum(transaction => transaction.Amount), totalExpense),
                    TransactionCount = group.Count()
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
                    Percentage = CalculatePercentage(group.Sum(transaction => transaction.Amount), totalExpense),
                    TransactionCount = group.Count()
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
