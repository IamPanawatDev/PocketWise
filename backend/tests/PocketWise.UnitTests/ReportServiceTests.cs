using PocketWise.Application.DTOs.Reports;
using PocketWise.Application.Features.Reports;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Enums;
using Xunit;

namespace PocketWise.UnitTests;

public class ReportServiceTests
{
    [Fact]
    public async Task GetSummaryAsync_KeepsCurrenciesSeparate()
    {
        var service = new ReportService(new InMemoryReportRepository(
        [
            new ReportTransactionRecord
            {
                TransactionDate = new DateTime(2026, 10, 4, 1, 0, 0),
                TransactionType = TransactionType.Expense,
                Amount = 120m,
                CurrencyCode = "THB",
                SourceType = SourceType.Manual
            },
            new ReportTransactionRecord
            {
                TransactionDate = new DateTime(2026, 10, 4, 2, 0, 0),
                TransactionType = TransactionType.Expense,
                Amount = 5m,
                CurrencyCode = "USD",
                SourceType = SourceType.CardStatement
            }
        ]));

        var result = await service.GetSummaryAsync(
            1,
            new DateTimeOffset(2026, 10, 3, 17, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 4, 16, 59, 59, TimeSpan.Zero),
            null,
            null);

        Assert.Collection(
            result.Currencies,
            thb =>
            {
                Assert.Equal("THB", thb.CurrencyCode);
                Assert.Equal(120m, thb.TotalExpense);
            },
            usd =>
            {
                Assert.Equal("USD", usd.CurrencyCode);
                Assert.Equal(5m, usd.TotalExpense);
            });
    }

    [Fact]
    public async Task GetSummaryAsync_CalculatesSlipAndCreditCardTotals_Correctly()
    {
        // FR6.1.2: ดูภาพรวมรายจ่ายจากสลิปและบัตรเครดิต
        var service = new ReportService(new InMemoryReportRepository(
        [
            new ReportTransactionRecord
            {
                TransactionDate = new DateTime(2026, 10, 4, 1, 0, 0),
                TransactionType = TransactionType.Expense,
                Amount = 500m,
                CurrencyCode = "THB",
                SourceType = SourceType.Slip
            },
            new ReportTransactionRecord
            {
                TransactionDate = new DateTime(2026, 10, 4, 2, 0, 0),
                TransactionType = TransactionType.Expense,
                Amount = 1200m,
                CurrencyCode = "THB",
                SourceType = SourceType.Manual,
                CreditCardId = 10,
                CardName = "KBank Passion",
                CreditCardBankName = "KBank"
            },
            new ReportTransactionRecord
            {
                TransactionDate = new DateTime(2026, 10, 4, 3, 0, 0),
                TransactionType = TransactionType.Expense,
                Amount = 300m,
                CurrencyCode = "THB",
                SourceType = SourceType.CardStatement
            },
            new ReportTransactionRecord
            {
                TransactionDate = new DateTime(2026, 10, 4, 4, 0, 0),
                TransactionType = TransactionType.Expense,
                Amount = 100m,
                CurrencyCode = "THB",
                SourceType = SourceType.Manual
            }
        ]));

        var result = await service.GetSummaryAsync(
            1,
            new DateTimeOffset(2026, 10, 3, 17, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 4, 16, 59, 59, TimeSpan.Zero),
            null,
            null);

        var thb = Assert.Single(result.Currencies);
        Assert.Equal(2100m, thb.TotalExpense);
        Assert.Equal(500m, thb.TotalSlipExpense); // 500 from Slip
        Assert.Equal(1500m, thb.TotalCreditCardExpense); // 1200 with CreditCardId + 300 CardStatement
        
        var slipBreakdown = Assert.Single(thb.SourceBreakdown, s => s.SourceType == "slip");
        Assert.Equal(500m, slipBreakdown.Amount);
        Assert.Equal(1, slipBreakdown.TransactionCount);

        var cardBreakdown = Assert.Single(thb.CreditCardBreakdown, c => c.CreditCardId == 10);
        Assert.Equal(1200m, cardBreakdown.Amount);
        Assert.Equal(1, cardBreakdown.TransactionCount);
    }

    [Fact]
    public async Task GetTrendsAsync_UsesBangkokSundayAsWeeklyPeriodStart()
    {
        var service = new ReportService(new InMemoryReportRepository(
        [
            new ReportTransactionRecord
            {
                TransactionDate = new DateTime(2026, 10, 4, 0, 30, 0),
                TransactionType = TransactionType.Expense,
                Amount = 100m,
                CurrencyCode = "THB",
                SourceType = SourceType.Manual
            },
            new ReportTransactionRecord
            {
                TransactionDate = new DateTime(2026, 10, 11, 0, 30, 0),
                TransactionType = TransactionType.Expense,
                Amount = 50m,
                CurrencyCode = "THB",
                SourceType = SourceType.Manual
            }
        ]));

        var result = await service.GetTrendsAsync(
            1,
            new DateTimeOffset(2026, 10, 3, 17, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 11, 16, 59, 59, TimeSpan.Zero),
            "weekly",
            null,
            null);

        Assert.Collection(
            result.Series,
            first =>
            {
                Assert.Equal(new DateOnly(2026, 10, 4), first.PeriodStart);
                Assert.Equal(100m, first.Expense);
            },
            second =>
            {
                Assert.Equal(new DateOnly(2026, 10, 11), second.PeriodStart);
                Assert.Equal(50m, second.Expense);
            });
    }

    [Fact]
    public async Task ExportReportAsync_Csv_GeneratesUtf8BomAndCorrectContent()
    {
        var service = new ReportService(new InMemoryReportRepository(
        [
            new ReportTransactionRecord
            {
                TransactionId = 1,
                TransactionDate = new DateTime(2026, 10, 4, 5, 30, 0, DateTimeKind.Utc),
                TransactionType = TransactionType.Expense,
                Amount = 80m,
                CurrencyCode = "THB",
                SourceType = SourceType.Slip,
                CategoryName = "อาหารและเครื่องดื่ม",
                MerchantName = "ร้านข้าวแกง",
                Description = "อาหารเที่ยง"
            }
        ]));

        var result = await service.ExportReportAsync(
            1,
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 31, 23, 59, 59, TimeSpan.Zero),
            "csv",
            "full",
            null,
            null);

        Assert.Equal("text/csv; charset=utf-8", result.ContentType);
        Assert.EndsWith(".csv", result.FileName);
        Assert.True(result.Content.Length > 3);

        // Verify UTF-8 BOM: 0xEF, 0xBB, 0xBF
        Assert.Equal(0xEF, result.Content[0]);
        Assert.Equal(0xBB, result.Content[1]);
        Assert.Equal(0xBF, result.Content[2]);

        var text = System.Text.Encoding.UTF8.GetString(result.Content[3..]);
        Assert.Contains("PocketWise Financial Report", text);
        Assert.Contains("อาหารและเครื่องดื่ม", text);
        Assert.Contains("ร้านข้าวแกง", text);
        Assert.Contains("80.00", text);
        Assert.Contains("สลิปโอนเงิน", text);
    }

    [Fact]
    public async Task ExportReportAsync_Json_GeneratesValidJsonContent()
    {
        var service = new ReportService(new InMemoryReportRepository(
        [
            new ReportTransactionRecord
            {
                TransactionId = 2,
                TransactionDate = new DateTime(2026, 10, 5, 1, 0, 0, DateTimeKind.Utc),
                TransactionType = TransactionType.Income,
                Amount = 30000m,
                CurrencyCode = "THB",
                SourceType = SourceType.Manual,
                CategoryName = "เงินเดือน"
            }
        ]));

        var result = await service.ExportReportAsync(
            1,
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 31, 23, 59, 59, TimeSpan.Zero),
            "json",
            "full",
            null,
            null);

        Assert.Equal("application/json; charset=utf-8", result.ContentType);
        Assert.EndsWith(".json", result.FileName);

        var json = System.Text.Encoding.UTF8.GetString(result.Content);
        Assert.Contains("30000", json);
        Assert.Contains("เงินเดือน", json);
    }

    private sealed class InMemoryReportRepository(
        IReadOnlyList<ReportTransactionRecord> transactions) : IReportRepository
    {
        public Task<IReadOnlyList<ReportTransactionRecord>> GetTransactionsAsync(
            long userId,
            DateTime fromUtc,
            DateTime toUtc,
            long? categoryId,
            long? tagId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(transactions);
        }
    }
}
