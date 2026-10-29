using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Interfaces;

namespace PocketWise.Infrastructure.Services;

/// <summary>
/// AI-powered slip extractor using Google Gemini (e.g. gemini-2.5-flash).
/// Provides high accuracy, fast turnaround (~1-2s), and zero CPU strain on the host server.
/// If GEMINI_API_KEY is not configured or an error occurs, it automatically falls back to TesseractSlipOcrService.
/// </summary>
public class GeminiSlipOcrService : ISlipOcrService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly TesseractSlipOcrService _fallbackService;
    private readonly ILogger<GeminiSlipOcrService>? _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public GeminiSlipOcrService(
        HttpClient httpClient,
        IConfiguration configuration,
        TesseractSlipOcrService fallbackService,
        ILogger<GeminiSlipOcrService>? logger = null)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _fallbackService = fallbackService;
        _logger = logger;
    }

    public async Task<SlipExtractedData> ExtractDataAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        // 1. Check API Key
        var apiKey = _configuration["GEMINI_API_KEY"]
            ?? _configuration["Gemini:ApiKey"]
            ?? _configuration["Gemini__ApiKey"];

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger?.LogWarning("[GeminiSlipOcrService] GEMINI_API_KEY is not configured. Falling back to Tesseract.");
            fileStream.Seek(0, SeekOrigin.Begin);
            return await _fallbackService.ExtractDataAsync(fileStream, fileName, contentType, cancellationToken);
        }

        try
        {
            fileStream.Seek(0, SeekOrigin.Begin);
            using var ms = new MemoryStream();
            await fileStream.CopyToAsync(ms, cancellationToken);
            var imageBytes = ms.ToArray();

            if (imageBytes.Length == 0)
            {
                _logger?.LogWarning("[GeminiSlipOcrService] Empty file stream provided for {FileName}.", fileName);
                fileStream.Seek(0, SeekOrigin.Begin);
                return await _fallbackService.ExtractDataAsync(fileStream, fileName, contentType, cancellationToken);
            }

            var mimeType = NormalizeMimeType(contentType, fileName);
            var base64Data = Convert.ToBase64String(imageBytes);

            var model = _configuration["Gemini:Model"] ?? "gemini-2.5-flash";
            _logger?.LogInformation("[GeminiSlipOcrService] Sending slip {FileName} ({Bytes} bytes) to Gemini ({Model})...",
                fileName, imageBytes.Length, model);

            var result = await TryAnalyzeWithGeminiAsync(apiKey, model, base64Data, mimeType, cancellationToken);

            // If gemini-2.5-flash failed with 404/NotFound or similar model error, try gemini-1.5-flash as secondary model
            if (result == null && model != "gemini-1.5-flash")
            {
                _logger?.LogInformation("[GeminiSlipOcrService] Retrying with model 'gemini-1.5-flash'...");
                result = await TryAnalyzeWithGeminiAsync(apiKey, "gemini-1.5-flash", base64Data, mimeType, cancellationToken);
            }

            if (result != null && (result.DetectedAmount.HasValue || !string.IsNullOrWhiteSpace(result.TransactionReference)))
            {
                _logger?.LogInformation("[GeminiSlipOcrService] Gemini successfully extracted: Bank={Bank}, Amount={Amt}, Date={Date}, Payee={Payee}, Ref={Ref}",
                    result.BankCode, result.DetectedAmount, result.DetectedAt, result.PayeeName, result.TransactionReference);
                return result;
            }

            _logger?.LogWarning("[GeminiSlipOcrService] Gemini returned incomplete data. Falling back to Tesseract.");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[GeminiSlipOcrService] Gemini analysis failed. Falling back to Tesseract.");
        }

        // Fallback to local Tesseract
        fileStream.Seek(0, SeekOrigin.Begin);
        return await _fallbackService.ExtractDataAsync(fileStream, fileName, contentType, cancellationToken);
    }

    private async Task<SlipExtractedData?> TryAnalyzeWithGeminiAsync(
        string apiKey,
        string model,
        string base64Data,
        string mimeType,
        CancellationToken cancellationToken)
    {
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

        var prompt = @"คุณคือผู้เชี่ยวชาญการอ่านสลิปโอนเงินธนาคารของประเทศไทย
กรุณาวิเคราะห์รูปภาพสลิปที่แนบมานี้อย่างละเอียด และส่งข้อมูลกลับมาเป็น JSON ตามโครงสร้างนี้เท่านั้น:
{
  ""bankCode"": ""KBANK"" | ""SCB"" | ""KTB"" | ""BBL"" | ""TTB"" | ""BAY"" | ""GSB"" | ""UOB"" | ""CIMB"" | null,
  ""payerName"": ""ชื่อผู้โอน หรือ บัญชีต้นทาง (From/จาก)"",
  ""payeeName"": ""ชื่อผู้รับ หรือ บัญชีปลายทาง หรือ ชื่อร้านค้า (To/ไปยัง)"",
  ""amount"": 0.00 (จำนวนเงินที่โอน เป็นตัวเลขทศนิยม ห้ามใส่เครื่องหมายจุลภาค เช่น 1070.00),
  ""transactionDate"": ""YYYY-MM-DDTHH:mm:ss"" (วันเวลาที่ทำรายการ แปลงเป็นปี ค.ศ. เช่น 2026-10-29T21:25:00 หากไม่ทราบเวลาให้ใส่ 00:00:00),
  ""transactionReference"": ""รหัสอ้างอิง หรือ เลขที่รายการ หรือ Transaction ID หรือ Ref"",
  ""rawText"": ""ข้อความสรุปสำคัญทั้งหมดบนสลิป""
}

ข้อกำหนดสำคัญ:
- bankCode ให้ระบุเป็นตัวย่อมาตรฐานของธนาคารไทยเท่านั้น (KBANK, SCB, KTB, BBL, TTB, BAY, GSB, UOB, CIMB)
- amount ต้องเป็นตัวเลขเท่านั้น (เช่น 1070 หรือ 1070.50)
- หากมีปี พ.ศ. เช่น 2567 ให้แปลงเป็นปี ค.ศ. เช่น 2024
- ตอบเป็น JSON ล้วนๆ ห้ามใส่คำอธิบายอื่นนอกเหนือจาก JSON";

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new
                        {
                            inlineData = new
                            {
                                mimeType = mimeType,
                                data = base64Data
                            }
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.1,
                responseMimeType = "application/json"
            }
        };

        var jsonContent = JsonSerializer.Serialize(payload, JsonOptions);
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseString = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger?.LogWarning("[GeminiSlipOcrService] Gemini API call returned {StatusCode}: {Response}",
                response.StatusCode, responseString.Length > 300 ? responseString[..300] : responseString);
            return null;
        }

        return ParseGeminiResponse(responseString);
    }

    private SlipExtractedData? ParseGeminiResponse(string responseJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            if (!doc.RootElement.TryGetProperty("candidates", out var candidates) ||
                candidates.GetArrayLength() == 0)
            {
                return null;
            }

            var firstCandidate = candidates[0];
            if (!firstCandidate.TryGetProperty("content", out var content) ||
                !content.TryGetProperty("parts", out var parts) ||
                parts.GetArrayLength() == 0)
            {
                return null;
            }

            var textPart = parts[0];
            if (!textPart.TryGetProperty("text", out var textElem))
            {
                return null;
            }

            var rawJsonText = textElem.GetString();
            if (string.IsNullOrWhiteSpace(rawJsonText))
            {
                return null;
            }

            // Clean markdown code blocks if present
            rawJsonText = rawJsonText.Trim();
            if (rawJsonText.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            {
                rawJsonText = rawJsonText[7..];
            }
            else if (rawJsonText.StartsWith("```"))
            {
                rawJsonText = rawJsonText[3..];
            }
            if (rawJsonText.EndsWith("```"))
            {
                rawJsonText = rawJsonText[..^3];
            }
            rawJsonText = rawJsonText.Trim();

            var parsed = JsonSerializer.Deserialize<GeminiSlipResponseDto>(rawJsonText, JsonOptions);
            if (parsed == null) return null;

            var result = new SlipExtractedData
            {
                BankCode = NormalizeBankCode(parsed.BankCode),
                PayerName = CleanName(parsed.PayerName),
                PayeeName = CleanName(parsed.PayeeName),
                DetectedAmount = parsed.Amount ?? parsed.DetectedAmount,
                TransactionReference = parsed.TransactionReference ?? parsed.ReferenceNo,
                RawText = parsed.RawText ?? rawJsonText,
                DetectedAt = ParseSlipDateToUtc(parsed.TransactionDate ?? parsed.DetectedAt)
            };

            return result;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "[GeminiSlipOcrService] Error parsing Gemini JSON output.");
            return null;
        }
    }

    private static DateTime? ParseSlipDateToUtc(string? dateStr)
    {
        if (string.IsNullOrWhiteSpace(dateStr)) return null;

        if (DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt) ||
            DateTime.TryParse(dateStr, out dt))
        {
            var year = dt.Year;
            if (year >= 2500 && year <= 2600)
            {
                year -= 543;
            }

            // Thai bank slips display Thailand Local Time (Asia/Bangkok, UTC+7)
            var dto = new DateTimeOffset(year, dt.Month, dt.Day, dt.Hour, dt.Minute, dt.Second, TimeSpan.FromHours(7));
            return dto.UtcDateTime;
        }

        return null;
    }

    private static string NormalizeMimeType(string? contentType, string fileName)
    {
        if (!string.IsNullOrWhiteSpace(contentType) && contentType.Contains('/'))
        {
            var clean = contentType.Split(';')[0].Trim().ToLowerInvariant();
            if (clean is "image/jpeg" or "image/jpg" or "image/png" or "image/webp" or "application/pdf")
            {
                return clean == "image/jpg" ? "image/jpeg" : clean;
            }
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "image/jpeg"
        };
    }

    private static string? NormalizeBankCode(string? bank)
    {
        if (string.IsNullOrWhiteSpace(bank)) return null;
        var b = bank.Trim().ToUpperInvariant();

        if (b.Contains("KBANK") || b.Contains("KASIKORN") || b.Contains("กสิกร")) return "KBANK";
        if (b.Contains("SCB") || b.Contains("ไทยพาณิชย์")) return "SCB";
        if (b.Contains("KTB") || b.Contains("KRUNGTHAI") || b.Contains("กรุงไทย")) return "KTB";
        if (b.Contains("BBL") || b.Contains("BANGKOK") || b.Contains("กรุงเทพ")) return "BBL";
        if (b.Contains("TTB") || b.Contains("TMB") || b.Contains("THANACHART") || b.Contains("ทหารไทย")) return "TTB";
        if (b.Contains("BAY") || b.Contains("KRUNGSRI") || b.Contains("กรุงศรี")) return "BAY";
        if (b.Contains("GSB") || b.Contains("ออมสิน")) return "GSB";
        if (b.Contains("UOB")) return "UOB";
        if (b.Contains("CIMB")) return "CIMB";

        return b;
    }

    private static string? CleanName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var trimmed = name.Trim();
        return trimmed.Length > 0 ? trimmed : null;
    }

    private sealed class GeminiSlipResponseDto
    {
        [JsonPropertyName("bankCode")]
        public string? BankCode { get; set; }

        [JsonPropertyName("payerName")]
        public string? PayerName { get; set; }

        [JsonPropertyName("payeeName")]
        public string? PayeeName { get; set; }

        [JsonPropertyName("amount")]
        public decimal? Amount { get; set; }

        [JsonPropertyName("detectedAmount")]
        public decimal? DetectedAmount { get; set; }

        [JsonPropertyName("transactionDate")]
        public string? TransactionDate { get; set; }

        [JsonPropertyName("detectedAt")]
        public string? DetectedAt { get; set; }

        [JsonPropertyName("transactionReference")]
        public string? TransactionReference { get; set; }

        [JsonPropertyName("referenceNo")]
        public string? ReferenceNo { get; set; }

        [JsonPropertyName("rawText")]
        public string? RawText { get; set; }
    }
}
