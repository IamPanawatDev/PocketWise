using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PocketWise.Api.Configuration;
using PocketWise.Domain.Enums;

namespace PocketWise.IntegrationTests;

public class ControllerJsonOptionsTests
{
    [Fact]
    public void Configure_UsesCamelCaseForPropertiesAndEnums()
    {
        var options = new JsonOptions();
        ControllerJsonOptionsConfiguration.Configure(options);

        var json = JsonSerializer.Serialize(
            new { TransactionType = TransactionType.Expense },
            options.JsonSerializerOptions);

        Assert.Equal("""{"transactionType":"expense"}""", json);
    }

    [Fact]
    public void Configure_SerializesUnspecifiedDateTimesAsUtc()
    {
        var options = new JsonOptions();
        ControllerJsonOptionsConfiguration.Configure(options);
        var value = DateTime.SpecifyKind(
            new DateTime(2026, 10, 16, 5, 0, 0),
            DateTimeKind.Unspecified);

        var json = JsonSerializer.Serialize(
            new { TransactionDate = value },
            options.JsonSerializerOptions);

        Assert.Equal("""{"transactionDate":"2026-10-16T05:00:00Z"}""", json);
    }

    [Fact]
    public void Configure_DeserializesUnspecifiedDateTimesAsUtc()
    {
        var options = new JsonOptions();
        ControllerJsonOptionsConfiguration.Configure(options);

        var value = JsonSerializer.Deserialize<DateTime>(
            "\"2026-10-16T05:00:00\"",
            options.JsonSerializerOptions);

        Assert.Equal(DateTimeKind.Utc, value.Kind);
    }
}
