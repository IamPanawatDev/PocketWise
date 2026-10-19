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
}
