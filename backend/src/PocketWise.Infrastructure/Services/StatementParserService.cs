using System.Text.Json;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Infrastructure.Services;

public class StatementParserService : IStatementParserService
{
    public async Task<ParsedStatementData> ParseStatementAsync(
        Stream stream,
        string fileName,
        string? format = null,
        CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var isJson = string.Equals(format, "json", StringComparison.OrdinalIgnoreCase) || ext == ".json";
        var isCsv = string.Equals(format, "csv", StringComparison.OrdinalIgnoreCase) || ext == ".csv";

        if (!isJson && !isCsv)
        {
            throw new BusinessException("UNSUPPORTED_FORMAT", "รองรับเฉพาะไฟล์รูปแบบ CSV (.csv) หรือ JSON (.json) เท่านั้น");
        }

        if (isJson)
        {
            return await ParseJsonAsync(stream, cancellationToken);
        }

        return await ParseCsvAsync(stream, cancellationToken);
    }

    private static async Task<ParsedStatementData> ParseJsonAsync(Stream stream, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(stream);
        var json = await reader.ReadToEndAsync(cancellationToken);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var result = new ParsedStatementData();

        if (root.TryGetProperty("statementDate", out var stDateProp) && DateOnly.TryParse(stDateProp.GetString(), out var stDate))
        {
            result.StatementDate = stDate;
        }
        else
        {
            result.StatementDate = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        if (root.TryGetProperty("statementPeriodStart", out var pStartProp) && DateOnly.TryParse(pStartProp.GetString(), out var pStart))
        {
            result.StatementPeriodStart = pStart;
        }

        if (root.TryGetProperty("statementPeriodEnd", out var pEndProp) && DateOnly.TryParse(pEndProp.GetString(), out var pEnd))
        {
            result.StatementPeriodEnd = pEnd;
        }

        if (root.TryGetProperty("paymentDueDate", out var dueProp) && DateOnly.TryParse(dueProp.GetString(), out var due))
        {
            result.PaymentDueDate = due;
        }

        if (root.TryGetProperty("previousBalance", out var prevProp))
        {
            result.PreviousBalance = prevProp.GetDecimal();
        }

        if (root.TryGetProperty("purchaseAmount", out var purchProp))
        {
            result.PurchaseAmount = purchProp.GetDecimal();
        }

        if (root.TryGetProperty("totalDue", out var dueAmountProp))
        {
            result.TotalDue = dueAmountProp.GetDecimal();
        }

        if (root.TryGetProperty("items", out var itemsProp) && itemsProp.ValueKind == JsonValueKind.Array)
        {
            foreach (var itemElem in itemsProp.EnumerateArray())
            {
                var item = new ParsedStatementItem();

                if (itemElem.TryGetProperty("transactionDate", out var dProp) && DateOnly.TryParse(dProp.GetString(), out var d))
                {
                    item.TransactionDate = d;
                }
                else
                {
                    item.TransactionDate = result.StatementDate;
                }

                if (itemElem.TryGetProperty("description", out var descProp))
                {
                    item.Description = descProp.GetString() ?? string.Empty;
                }

                if (itemElem.TryGetProperty("amount", out var amtProp))
                {
                    item.Amount = Math.Abs(amtProp.GetDecimal());
                }

                if (itemElem.TryGetProperty("itemType", out var typeProp))
                {
                    item.ItemType = ParseItemType(typeProp.GetString());
                }

                if (itemElem.TryGetProperty("externalReference", out var refProp))
                {
                    item.ExternalReference = refProp.GetString();
                }

                if (item.Amount > 0)
                {
                    result.Items.Add(item);
                }
            }
        }

        RecalculateTotalsIfMissing(result);
        return result;
    }

    private static async Task<ParsedStatementData> ParseCsvAsync(Stream stream, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(stream);
        var lines = new List<string>();
        string? line;
        while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
        {
            if (!string.IsNullOrWhiteSpace(line))
            {
                lines.Add(line.Trim());
            }
        }

        if (lines.Count == 0)
        {
            throw new BusinessException("VALIDATION_ERROR", "ไฟล์ CSV ว่างเปล่า");
        }

        var result = new ParsedStatementData
        {
            StatementDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Extract any leading comment metadata (# key: value)
        foreach (var l in lines)
        {
            if (l.StartsWith('#'))
            {
                var comment = l.TrimStart('#').Trim();
                var colonIdx = comment.IndexOf(':');
                if (colonIdx > 0)
                {
                    var key = comment[..colonIdx].Trim().ToLowerInvariant();
                    var val = comment[(colonIdx + 1)..].Trim();
                    if (key.Contains("due_date") || key.Contains("due"))
                    {
                        if (DateOnly.TryParse(val, out var d)) result.PaymentDueDate = d;
                    }
                    else if (key.Contains("period_start"))
                    {
                        if (DateOnly.TryParse(val, out var d)) result.StatementPeriodStart = d;
                    }
                    else if (key.Contains("period_end"))
                    {
                        if (DateOnly.TryParse(val, out var d)) result.StatementPeriodEnd = d;
                    }
                    else if (key.Contains("statement_date") || key == "date")
                    {
                        if (DateOnly.TryParse(val, out var d)) result.StatementDate = d;
                    }
                }
            }
        }

        // Determine header indices
        int dateIdx = -1, descIdx = -1, amtIdx = -1, typeIdx = -1, refIdx = -1;
        var startIndex = 0;

        for (var i = 0; i < lines.Count; i++)
        {
            var cols = ParseCsvRow(lines[i]);
            for (var c = 0; c < cols.Length; c++)
            {
                var col = cols[c].Trim().ToLowerInvariant();
                if (col.Contains("date") || col.Contains("วันที่")) dateIdx = c;
                else if (col.Contains("desc") || col.Contains("รายการ") || col.Contains("description")) descIdx = c;
                else if (col.Contains("amount") || col.Contains("จำนวนเงิน") || col.Contains("ยอดเงิน")) amtIdx = c;
                else if (col.Contains("type") || col.Contains("ประเภท")) typeIdx = c;
                else if (col.Contains("ref") || col.Contains("อ้างอิง")) refIdx = c;
            }

            if (dateIdx != -1 && amtIdx != -1)
            {
                startIndex = i + 1;
                break;
            }
        }

        if (dateIdx == -1 || amtIdx == -1)
        {
            // Default columns fallback: 0 = Date, 1 = Description, 2 = Amount, 3 = Type, 4 = Ref
            dateIdx = 0;
            descIdx = 1;
            amtIdx = 2;
            typeIdx = 3;
            refIdx = 4;
            startIndex = 0;
        }

        for (var i = startIndex; i < lines.Count; i++)
        {
            var cols = ParseCsvRow(lines[i]);
            if (cols.Length <= Math.Max(dateIdx, amtIdx)) continue;

            if (!decimal.TryParse(cols[amtIdx].Replace(",", "").Trim(), out var amount) || amount <= 0)
            {
                continue;
            }

            var dateStr = cols[dateIdx].Trim();
            if (!DateOnly.TryParse(dateStr, out var date))
            {
                date = result.StatementDate;
            }

            var desc = descIdx >= 0 && descIdx < cols.Length ? cols[descIdx].Trim() : "รายการบัตรเครดิต";
            var itemType = typeIdx >= 0 && typeIdx < cols.Length ? ParseItemType(cols[typeIdx].Trim()) : StatementItemType.Purchase;
            var extRef = refIdx >= 0 && refIdx < cols.Length ? cols[refIdx].Trim() : null;

            result.Items.Add(new ParsedStatementItem
            {
                TransactionDate = date,
                Description = desc,
                Amount = Math.Abs(amount),
                ItemType = itemType,
                ExternalReference = string.IsNullOrWhiteSpace(extRef) ? null : extRef
            });
        }

        RecalculateTotalsIfMissing(result);
        return result;
    }

    private static void RecalculateTotalsIfMissing(ParsedStatementData data)
    {
        if (data.Items.Count > 0)
        {
            if (data.StatementPeriodStart == default)
            {
                data.StatementPeriodStart = data.Items.Min(i => i.TransactionDate);
            }
            if (data.StatementPeriodEnd == default)
            {
                data.StatementPeriodEnd = data.Items.Max(i => i.TransactionDate);
            }
            if (data.StatementDate == default)
            {
                data.StatementDate = data.StatementPeriodEnd;
            }
            if (!data.PaymentDueDate.HasValue)
            {
                data.PaymentDueDate = data.StatementDate.AddDays(15);
            }

            if (data.PurchaseAmount == 0)
            {
                data.PurchaseAmount = data.Items.Where(i => i.ItemType == StatementItemType.Purchase).Sum(i => i.Amount);
            }

            if (data.TotalDue == 0)
            {
                var charges = data.Items.Where(i => i.ItemType != StatementItemType.Payment && i.ItemType != StatementItemType.Cashback).Sum(i => i.Amount);
                var credits = data.Items.Where(i => i.ItemType == StatementItemType.Payment || i.ItemType == StatementItemType.Cashback).Sum(i => i.Amount);
                data.TotalDue = Math.Max(0, data.PreviousBalance + charges - credits);
            }
        }
        else
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (data.StatementDate == default) data.StatementDate = today;
            if (data.StatementPeriodStart == default) data.StatementPeriodStart = today.AddDays(-30);
            if (data.StatementPeriodEnd == default) data.StatementPeriodEnd = today;
            if (!data.PaymentDueDate.HasValue) data.PaymentDueDate = today.AddDays(15);
        }
    }

    private static StatementItemType ParseItemType(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return StatementItemType.Purchase;
        var t = text.Trim().ToLowerInvariant();
        if (t.Contains("installment") || t.Contains("ผ่อน")) return StatementItemType.Installment;
        if (t.Contains("interest") || t.Contains("ดอกเบี้ย")) return StatementItemType.Interest;
        if (t.Contains("cashback") || t.Contains("เงินคืน")) return StatementItemType.Cashback;
        if (t.Contains("fee") || t.Contains("ค่าธรรมเนียม")) return StatementItemType.Fee;
        if (t.Contains("payment") || t.Contains("ชำระ") || t.Contains("จ่าย")) return StatementItemType.Payment;
        return StatementItemType.Purchase;
    }

    private static string[] ParseCsvRow(string row)
    {
        var cols = new List<string>();
        var inQuotes = false;
        var current = new System.Text.StringBuilder();

        for (var i = 0; i < row.Length; i++)
        {
            var ch = row[i];
            if (ch == '\"')
            {
                inQuotes = !inQuotes;
            }
            else if (ch == ',' && !inQuotes)
            {
                cols.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(ch);
            }
        }
        cols.Add(current.ToString());
        return cols.ToArray();
    }
}
