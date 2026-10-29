using System.Net;
using System.Text;
using Microsoft.Extensions.Configuration;
using PocketWise.Infrastructure.Services;
using Xunit;

namespace PocketWise.UnitTests;

public class GeminiSlipOcrServiceTests
{
    private class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_handler(request));
        }
    }

    [Fact]
    public async Task ExtractDataAsync_WhenApiKeyMissing_FallsBackToTesseract()
    {
        // Arrange
        var inMemoryConfig = new Dictionary<string, string?>();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();
        var fallback = new TesseractSlipOcrService();
        var handler = new MockHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var httpClient = new HttpClient(handler);

        var service = new GeminiSlipOcrService(httpClient, configuration, fallback);
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes("sample image dummy"));

        // Act
        var result = await service.ExtractDataAsync(stream, "slip_150.jpg", "image/jpeg");

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task ExtractDataAsync_WhenGeminiReturnsValidJson_ExtractsCorrectly()
    {
        // Arrange
        var inMemoryConfig = new Dictionary<string, string?>
        {
            ["GEMINI_API_KEY"] = "fake-key"
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();
        var fallback = new TesseractSlipOcrService();

        var geminiResponseJson = @"{
  ""candidates"": [
    {
      ""content"": {
        ""parts"": [
          {
            ""text"": ""{\r\n  \""bankCode\"": \""KTB\"",\r\n  \""payerName\"": \""นายสมชาย\"",\r\n  \""payeeName\"": \""ร้านอร่อยดี\"",\r\n  \""amount\"": 1070.00,\r\n  \""transactionDate\"": \""2026-10-29T21:25:00\"",\r\n  \""transactionReference\"": \""20261029123456789\"",\r\n  \""rawText\"": \""โอนเงินสำเร็จ 1,070.00 บาท ร้านอร่อยดี\""\r\n}""
          }
        ]
      }
    }
  ]
}";

        var handler = new MockHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(geminiResponseJson, Encoding.UTF8, "application/json")
        });
        var httpClient = new HttpClient(handler);

        var service = new GeminiSlipOcrService(httpClient, configuration, fallback);
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes("sample image bytes"));

        // Act
        var result = await service.ExtractDataAsync(stream, "test_slip.jpg", "image/jpeg");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("KTB", result.BankCode);
        Assert.Equal(1070.00m, result.DetectedAmount);
        Assert.Equal("นายสมชาย", result.PayerName);
        Assert.Equal("ร้านอร่อยดี", result.PayeeName);
        Assert.Equal("20261029123456789", result.TransactionReference);
        Assert.NotNull(result.DetectedAt);
        Assert.Equal(2026, result.DetectedAt.Value.Year);
        Assert.Equal(10, result.DetectedAt.Value.Month);
        Assert.Equal(29, result.DetectedAt.Value.Day);
    }

    [Fact]
    public async Task ExtractDataAsync_WhenGeminiReturnsHttpError_FallsBackToTesseractWithoutCrashing()
    {
        // Arrange
        var inMemoryConfig = new Dictionary<string, string?>
        {
            ["GEMINI_API_KEY"] = "fake-key"
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();
        var fallback = new TesseractSlipOcrService();

        var handler = new MockHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent("Internal Server Error")
        });
        var httpClient = new HttpClient(handler);

        var service = new GeminiSlipOcrService(httpClient, configuration, fallback);
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes("sample image bytes"));

        // Act
        var result = await service.ExtractDataAsync(stream, "slip.jpg", "image/jpeg");

        // Assert
        Assert.NotNull(result);
    }
}
