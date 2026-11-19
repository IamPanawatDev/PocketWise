using PocketWise.Application.Common;
using PocketWise.Domain.Entities;
using Xunit;

namespace PocketWise.UnitTests;

public class ThaiBankHelperTests
{
    [Theory]
    [InlineData("KTB", "KTB")]
    [InlineData("ktb", "KTB")]
    [InlineData("006", "KTB")]
    [InlineData("06", "KTB")]
    [InlineData("กรุงไทย", "KTB")]
    [InlineData("ธนาคารกรุงไทย", "KTB")]
    [InlineData("KRUNGTHAI", "KTB")]
    [InlineData("KBANK", "KBANK")]
    [InlineData("004", "KBANK")]
    [InlineData("กสิกรไทย", "KBANK")]
    [InlineData("SCB", "SCB")]
    [InlineData("014", "SCB")]
    [InlineData("ไทยพาณิชย์", "SCB")]
    [InlineData("BBL", "BBL")]
    [InlineData("002", "BBL")]
    [InlineData("กรุงเทพ", "BBL")]
    [InlineData("TTB", "TTB")]
    [InlineData("011", "TTB")]
    [InlineData("ทหารไทยธนชาต", "TTB")]
    [InlineData("BAY", "BAY")]
    [InlineData("025", "BAY")]
    [InlineData("กรุงศรี", "BAY")]
    [InlineData("GSB", "GSB")]
    [InlineData("030", "GSB")]
    [InlineData("ออมสิน", "GSB")]
    public void NormalizeBankCode_ShouldResolveCanonicalCode(string input, string expected)
    {
        var result = ThaiBankHelper.NormalizeBankCode(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void FindMatchingAccount_UserEnteredKtbAsBankName_WithNullBankCode_ShouldMatch()
    {
        // Matches the user's exact scenario:
        // AccountName = "บัญชีหลัก", BankName = "KTB", BankCode = null
        var accounts = new List<BankAccount>
        {
            new()
            {
                BankAccountId = 1,
                AccountName = "บัญชีหลัก",
                BankName = "KTB",
                BankCode = null,
                IsActive = true,
                IsDeleted = false
            }
        };

        var matched = ThaiBankHelper.FindMatchingAccount(accounts, "KTB");

        Assert.NotNull(matched);
        Assert.Equal(1, matched.BankAccountId);
    }

    [Fact]
    public void FindMatchingAccount_UserEnteredThaiBankName_ShouldMatch()
    {
        var accounts = new List<BankAccount>
        {
            new()
            {
                BankAccountId = 2,
                AccountName = "บัญชีออมทรัพย์",
                BankName = "ธนาคารกรุงไทย",
                BankCode = null,
                IsActive = true,
                IsDeleted = false
            }
        };

        var matched = ThaiBankHelper.FindMatchingAccount(accounts, "KTB");

        Assert.NotNull(matched);
        Assert.Equal(2, matched.BankAccountId);
    }

    [Fact]
    public void FindMatchingAccount_AccountNameContainsBank_ShouldMatch()
    {
        var accounts = new List<BankAccount>
        {
            new()
            {
                BankAccountId = 3,
                AccountName = "กรุงไทยเงินเดือน",
                BankName = "",
                BankCode = null,
                IsActive = true,
                IsDeleted = false
            }
        };

        var matched = ThaiBankHelper.FindMatchingAccount(accounts, "006");

        Assert.NotNull(matched);
        Assert.Equal(3, matched.BankAccountId);
    }

    [Fact]
    public void FindMatchingAccount_DeletedOrInactiveAccounts_ShouldNotMatch()
    {
        var accounts = new List<BankAccount>
        {
            new()
            {
                BankAccountId = 4,
                AccountName = "บัญชีหลัก",
                BankName = "KTB",
                BankCode = "KTB",
                IsActive = false,
                IsDeleted = false
            },
            new()
            {
                BankAccountId = 5,
                AccountName = "บัญชีหลัก 2",
                BankName = "KTB",
                BankCode = "KTB",
                IsActive = true,
                IsDeleted = true
            }
        };

        var matched = ThaiBankHelper.FindMatchingAccount(accounts, "KTB");

        Assert.Null(matched);
    }
}
