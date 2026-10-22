using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Interfaces;
using Tesseract;

namespace PocketWise.Infrastructure.Services;

public class TesseractSlipOcrService : ISlipOcrService
{
    private static readonly Regex AmountRegex = new(
        @"(?:จ[ำํา]นวนเงิน(?:รวม)?|ยอดเงิน(?:รวม)?|ยอดโอน|Amount|จำนวน)[:\s]*([0-9,]+(?:\.[0-9]{2})?)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex FallbackAmountRegex = new(
        @"([0-9,]+\.[0-9]{2})\s*(?:บาท|THB|บ\.)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ReferenceRegex = new(
        @"(?:รหัสอ้างอิง|เลขที่รายการ|Ref(?:erence)?|Txn(?:ID)?)[.:\s]*([a-zA-Z0-9]{8,35})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ThaiDateRegex = new(
        @"([0-3]?\d)\s*([ก-๙\.]+)\s*(25\d{2}|20\d{2})(?:[^\d]+([0-2]?\d)[:.]([0-5]\d))?",
        RegexOptions.Compiled);

    private static readonly Regex SimpleDateRegex = new(
        @"((?:20\d{2}|25\d{2})[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01]))(?:[^\d]+([0-2]?\d)[:.]([0-5]\d))?",
        RegexOptions.Compiled);

    private readonly ILogger<TesseractSlipOcrService>? _logger;

    public TesseractSlipOcrService(ILogger<TesseractSlipOcrService>? logger = null)
    {
        _logger = logger;
    }

    public async Task<SlipExtractedData> ExtractDataAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var result = new SlipExtractedData
        {
            DetectedAt = DateTime.UtcNow
        };

        try
        {
            fileStream.Seek(0, SeekOrigin.Begin);
            using var ms = new MemoryStream();
            await fileStream.CopyToAsync(ms, cancellationToken);
            var imageBytes = ms.ToArray();

            var tessDataPath = ResolveTessDataPath();
            _logger?.LogInformation("[TesseractSlipOcrService] Resolved tessdata path: {Path}", tessDataPath);

            if (Directory.Exists(tessDataPath) && File.Exists(Path.Combine(tessDataPath, "tha.traineddata")))
            {
                TesseractEngine? engine = null;
                try
                {
                    engine = new TesseractEngine(tessDataPath, "tha+eng", EngineMode.Default);
                }
                catch (Exception exInit)
                {
                    _logger?.LogWarning(exInit, "[TesseractSlipOcrService] Failed to init 'tha+eng', falling back to 'tha'");
                    try
                    {
                        engine = new TesseractEngine(tessDataPath, "tha", EngineMode.Default);
                    }
                    catch (Exception exTha)
                    {
                        _logger?.LogWarning(exTha, "[TesseractSlipOcrService] Failed to init 'tha', falling back to 'eng'");
                        engine = new TesseractEngine(tessDataPath, "eng", EngineMode.Default);
                    }
                }

                using (engine)
                {
                    using var pix = Pix.LoadFromMemory(imageBytes);
                    using var page = engine.Process(pix);

                    var ocrText = page.GetText() ?? string.Empty;
                    _logger?.LogInformation("[TesseractSlipOcrService] OCR text length: {Len}", ocrText.Length);
                    ParseSlipText(ocrText, result);
                    _logger?.LogInformation("[TesseractSlipOcrService] Parsed: Bank={Bank}, Amount={Amt}, Payer={Payer}, Payee={Payee}, Ref={Ref}",
                        result.BankCode, result.DetectedAmount, result.PayerName, result.PayeeName, result.TransactionReference);
                }
            }
            else
            {
                _logger?.LogWarning("[TesseractSlipOcrService] tessdata or tha.traineddata not found at {Path}", tessDataPath);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[TesseractSlipOcrService] OCR extraction failed for file {FileName}.", fileName);
        }

        return result;
    }

    private static void ParseSlipText(string text, SlipExtractedData result)
    {
        if (string.IsNullOrWhiteSpace(text)) return;

        var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        // 1. Bank Code Detection
        result.BankCode = DetectBank(text);

        // 2. Transaction Reference
        var refMatch = ReferenceRegex.Match(text);
        if (refMatch.Success)
        {
            result.TransactionReference = refMatch.Groups[1].Value.Trim();
        }

        // 2.1 Fallback Reference Detection (e.g. Krungthai slips where ref is below "โอนเงินสำเร็จ" without prefix)
        if (string.IsNullOrWhiteSpace(result.TransactionReference))
        {
            for (var i = 0; i < lines.Count; i++)
            {
                var line = lines[i];
                if (line.Contains("โอนเงินสำเร็จ") || line.Contains("ทำรายการสำเร็จ") || line.Contains("บันทึกรายการสำเร็จ"))
                {
                    for (var j = 1; j <= 2 && i + j < lines.Count; j++)
                    {
                        var candidate = lines[i + j].Trim();
                        if (Regex.IsMatch(candidate, @"^[a-zA-Z0-9]{12,35}$"))
                        {
                            result.TransactionReference = candidate;
                            break;
                        }
                    }
                    if (!string.IsNullOrWhiteSpace(result.TransactionReference)) break;
                }
            }
        }

        // 3. Amount Detection
        var amountMatch = AmountRegex.Match(text);
        if (amountMatch.Success)
        {
            var raw = amountMatch.Groups[1].Value.Replace(",", "").Trim();
            if (decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var amt) && amt > 0)
            {
                result.DetectedAmount = amt;
            }
        }

        if (!result.DetectedAmount.HasValue)
        {
            var fallbackAmountMatch = FallbackAmountRegex.Match(text);
            if (fallbackAmountMatch.Success)
            {
                var raw = fallbackAmountMatch.Groups[1].Value.Replace(",", "").Trim();
                if (decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var amt) && amt > 0)
                {
                    result.DetectedAmount = amt;
                }
            }
        }

        // 4. Date and Time Detection
        var dateMatch = ThaiDateRegex.Match(text);
        if (dateMatch.Success)
        {
            if (int.TryParse(dateMatch.Groups[1].Value, out var day) &&
                int.TryParse(dateMatch.Groups[3].Value, out var year))
            {
                var monthStr = dateMatch.Groups[2].Value;
                var month = ParseThaiMonth(monthStr);

                if (month > 0)
                {
                    // Convert Buddhist Era to CE
                    if (year >= 2500 && year <= 2600)
                    {
                        year -= 543;
                    }

                    var hour = 0;
                    var minute = 0;
                    if (dateMatch.Groups[4].Success && int.TryParse(dateMatch.Groups[4].Value, out var h))
                    {
                        hour = Math.Clamp(h, 0, 23);
                    }
                    if (dateMatch.Groups[5].Success && int.TryParse(dateMatch.Groups[5].Value, out var m))
                    {
                        minute = Math.Clamp(m, 0, 59);
                    }

                    if (day >= 1 && day <= DateTime.DaysInMonth(year, month))
                    {
                        result.DetectedAt = new DateTime(year, month, day, hour, minute, 0, DateTimeKind.Utc);
                    }
                }
            }
        }

        if (result.DetectedAt == null)
        {
            var simpleDateMatch = SimpleDateRegex.Match(text);
            if (simpleDateMatch.Success && DateTime.TryParse(simpleDateMatch.Groups[1].Value, out var dt))
            {
                result.DetectedAt = dt;
            }
        }

        // 5. Payer & Payee Detection
        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];

            // Look for "จาก" (From)
            if (result.PayerName == null && (line.StartsWith("จาก") || line.StartsWith("จอาก") || line.Equals("from", StringComparison.OrdinalIgnoreCase)))
            {
                var candidate = line.Replace("จาก", "").Replace("จอาก", "").Trim();
                if (string.IsNullOrWhiteSpace(candidate) && i + 1 < lines.Count)
                {
                    candidate = lines[i + 1];
                }
                candidate = CleanName(candidate);
                if (!string.IsNullOrWhiteSpace(candidate) && !IsBankNameOrAccount(candidate))
                {
                    result.PayerName = candidate;
                }
            }

            // Look for "ไปยัง" (To)
            if (result.PayeeName == null && (line.StartsWith("ไปยัง") || line.StartsWith("ถึง") || line.Equals("to", StringComparison.OrdinalIgnoreCase)))
            {
                var candidate = line.Replace("ไปยัง", "").Replace("ถึง", "").Trim();
                if (string.IsNullOrWhiteSpace(candidate) && i + 1 < lines.Count)
                {
                    candidate = lines[i + 1];
                }
                candidate = CleanName(candidate);
                if (!string.IsNullOrWhiteSpace(candidate) && !IsBankNameOrAccount(candidate))
                {
                    result.PayeeName = candidate;
                }
            }
        }

        // 5.1 Fallback Payer & Payee Detection (for slips without "จาก" / "ไปยัง" like Krungthai)
        if (result.PayerName == null || result.PayeeName == null)
        {
            var candidates = new List<string>();
            for (var i = 0; i < lines.Count; i++)
            {
                var line = lines[i];
                if (i + 1 < lines.Count && (lines[i + 1].Contains("xxx-") || lines[i + 1].Contains("%%%-") || IsBankNameOrAccount(lines[i + 1])))
                {
                    var cleaned = CleanName(line);
                    if (!string.IsNullOrWhiteSpace(cleaned) && !IsBankNameOrAccount(cleaned) && !cleaned.Contains("โอนเงิน") && !cleaned.Contains("สำเร็จ") && cleaned.Length >= 3)
                    {
                        candidates.Add(cleaned);
                    }
                }
            }

            if (result.PayerName == null && candidates.Count >= 1)
            {
                result.PayerName = candidates[0];
            }
            if (result.PayeeName == null && candidates.Count >= 2)
            {
                result.PayeeName = candidates[1];
            }
        }
    }

    private static string CleanName(string raw)
    {
        return Regex.Replace(raw, @"[0-9xX*#\-:.]+", " ")
            .Replace("นาย", "")
            .Replace("นางสาว", "")
            .Replace("นาง", "")
            .Trim();
    }

    private static bool IsBankNameOrAccount(string line)
    {
        var lower = line.ToLowerInvariant();
        return lower.Contains("xxx-") ||
               lower.Contains("%%%-") ||
               lower.Contains("กรุงไทย") ||
               lower.Contains("กสิกรไทย") ||
               lower.Contains("ไทยพาณิชย์") ||
               lower.Contains("กรุงเทพ");
    }

    private static string? DetectBank(string text)
    {
        var lower = text.ToLowerInvariant();
        if (lower.Contains("กรุงไทย") || lower.Contains("krungthai") || lower.Contains("ktb")) return "KTB";
        if (lower.Contains("กสิกร") || lower.Contains("kbank")) return "KBANK";
        if (lower.Contains("ไทยพาณิชย์") || lower.Contains("scb")) return "SCB";
        if (lower.Contains("กรุงเทพ") || lower.Contains("bbl") || lower.Contains("bangkok bank")) return "BBL";
        if (lower.Contains("ทหารไทย") || lower.Contains("ttb") || lower.Contains("ทีทีบี")) return "TTB";
        if (lower.Contains("ออมสิน") || lower.Contains("gsb")) return "GSB";
        if (lower.Contains("กรุงศรี") || lower.Contains("bay")) return "BAY";
        if (lower.Contains("ยูโอบี") || lower.Contains("uob")) return "UOB";
        if (lower.Contains("cimb") || lower.Contains("ซีไอเอ็มบี")) return "CIMB";
        return null;
    }

    private static int ParseThaiMonth(string monthStr)
    {
        var clean = monthStr.Replace(".", "").Replace(" ", "");
        if (clean.Contains("มค") || clean.Contains("มกรา")) return 1;
        if (clean.Contains("กพ") || clean.Contains("กุมภา")) return 2;
        if (clean.Contains("มีค") || clean.Contains("มีนา")) return 3;
        if (clean.Contains("เมย") || clean.Contains("เมษา")) return 4;
        if (clean.Contains("พค") || clean.Contains("พฤษภา")) return 5;
        if (clean.Contains("มิย") || clean.Contains("มิถุนา")) return 6;
        if (clean.Contains("กค") || clean.Contains("กรกฎา")) return 7;
        if (clean.Contains("สค") || clean.Contains("สิงหา")) return 8;
        if (clean.Contains("กย") || clean.Contains("กทุย") || clean.Contains("กันยา")) return 9;
        if (clean.Contains("ตค") || clean.Contains("ตุลา")) return 10;
        if (clean.Contains("พย") || clean.Contains("พฤศจิกา")) return 11;
        if (clean.Contains("ธค") || clean.Contains("ธันวา")) return 12;

        return 0;
    }

    private static string ResolveTessDataPath()
    {
        var local = Path.Combine(AppContext.BaseDirectory, "tessdata");
        if (Directory.Exists(local) && File.Exists(Path.Combine(local, "tha.traineddata")))
        {
            return Path.GetFullPath(local);
        }

        var linuxPaths = new[]
        {
            "/usr/share/tesseract-ocr/5/tessdata",
            "/usr/share/tesseract-ocr/4.00/tessdata",
            "/usr/share/tessdata"
        };
        foreach (var p in linuxPaths)
        {
            if (Directory.Exists(p) && File.Exists(Path.Combine(p, "tha.traineddata")))
            {
                return p;
            }
        }

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidates = new[]
            {
                Path.Combine(dir.FullName, "src", "PocketWise.Api", "tessdata"),
                Path.Combine(dir.FullName, "backend", "src", "PocketWise.Api", "tessdata"),
                Path.Combine(dir.FullName, "tessdata")
            };

            foreach (var c in candidates)
            {
                if (Directory.Exists(c) && File.Exists(Path.Combine(c, "tha.traineddata")))
                {
                    return Path.GetFullPath(c);
                }
            }

            dir = dir.Parent;
        }

        return local;
    }
}
