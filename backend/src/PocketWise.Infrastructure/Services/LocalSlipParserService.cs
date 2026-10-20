using System.Text.RegularExpressions;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Interfaces;

namespace PocketWise.Infrastructure.Services;

public class LocalSlipParserService : ISlipOcrService
{
    // Match explicit amount patterns only, e.g. slip_150.jpg, 150thb.png, amount-200.50.pdf
    private static readonly Regex ExplicitAmountRegex = new(
        @"(?:slip|amount|thb|baht)[-_]?(\d{1,6}(?:\.\d{1,2})?)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Match explicit date pattern YYYY-MM-DD or YYYYMMDD
    private static readonly Regex DateRegex = new(
        @"(?:date[-_]?)?((?:20\d{2}|25\d{2})[-_]?(?:0[1-9]|1[0-2])[-_]?(?:0[1-9]|[12]\d|3[01]))",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex BankRegex = new(
        @"(KBANK|SCB|BBL|KTB|TTB|BAY|GSB|UOB|CIMB)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public Task<SlipExtractedData> ExtractDataAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var result = new SlipExtractedData
        {
            DetectedAt = DateTime.UtcNow,
            TransactionReference = null
        };

        var fileNameWithoutExt = Path.GetFileNameWithoutExtension(fileName);

        // Extract bank if filename mentions bank code
        var bankMatch = BankRegex.Match(fileName);
        if (bankMatch.Success)
        {
            result.BankCode = bankMatch.Value.ToUpperInvariant();
        }

        // Only extract amount if filename explicitly indicates an amount keyword
        var amountMatch = ExplicitAmountRegex.Match(fileNameWithoutExt);
        if (amountMatch.Success && decimal.TryParse(amountMatch.Groups[1].Value, out var parsedAmount) && parsedAmount > 0)
        {
            result.DetectedAmount = parsedAmount;
        }

        // Try extracting date from filename only if year is valid AD (2000-2099) or BE (2500-2599)
        var dateMatch = DateRegex.Match(fileNameWithoutExt);
        if (dateMatch.Success)
        {
            var cleanDate = dateMatch.Groups[1].Value.Replace("-", "").Replace("_", "");
            if (DateTime.TryParseExact(cleanDate, "yyyyMMdd", null, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedDate))
            {
                // Convert BE (พ.ศ. 25xx) to CE (ค.ศ.)
                if (parsedDate.Year >= 2500 && parsedDate.Year <= 2600)
                {
                    parsedDate = parsedDate.AddYears(-543);
                }

                if (parsedDate.Year >= 2000 && parsedDate.Year <= 2100)
                {
                    result.DetectedAt = parsedDate;
                }
            }
        }

        return Task.FromResult(result);
    }
}
