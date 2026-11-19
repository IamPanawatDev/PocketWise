using PocketWise.Domain.Entities;

namespace PocketWise.Application.Common;

public record ThaiBankDefinition(
    string Code,
    string OfficialName,
    string DefaultAccountName,
    string NumericCode,
    string[] Aliases
);

public static class ThaiBankHelper
{
    public static readonly IReadOnlyList<ThaiBankDefinition> Banks = new List<ThaiBankDefinition>
    {
        new(
            Code: "KBANK",
            OfficialName: "ธนาคารกสิกรไทย",
            DefaultAccountName: "บัญชีธนาคารกสิกรไทย",
            NumericCode: "004",
            Aliases: ["KBANK", "KASIKORN", "KASIKORNBANK", "กสิกร", "กสิกรไทย", "004", "04"]
        ),
        new(
            Code: "SCB",
            OfficialName: "ธนาคารไทยพาณิชย์",
            DefaultAccountName: "บัญชีธนาคารไทยพาณิชย์",
            NumericCode: "014",
            Aliases: ["SCB", "SIAMCOMMERCIAL", "ไทยพาณิชย์", "014", "14"]
        ),
        new(
            Code: "KTB",
            OfficialName: "ธนาคารกรุงไทย",
            DefaultAccountName: "บัญชีธนาคารกรุงไทย",
            NumericCode: "006",
            Aliases: ["KTB", "KRUNGTHAI", "KRUNG THAI", "กรุงไทย", "006", "06"]
        ),
        new(
            Code: "BBL",
            OfficialName: "ธนาคารกรุงเทพ",
            DefaultAccountName: "บัญชีธนาคารกรุงเทพ",
            NumericCode: "002",
            Aliases: ["BBL", "BANGKOK", "BANGKOKBANK", "กรุงเทพ", "002", "02"]
        ),
        new(
            Code: "TTB",
            OfficialName: "ธนาคารทหารไทยธนชาต",
            DefaultAccountName: "บัญชีธนาคารทหารไทยธนชาต",
            NumericCode: "011",
            Aliases: ["TTB", "TMB", "THANACHART", "ทหารไทย", "ธนชาต", "ทหารไทยธนชาต", "011", "11"]
        ),
        new(
            Code: "BAY",
            OfficialName: "ธนาคารกรุงศรีอยุธยา",
            DefaultAccountName: "บัญชีธนาคารกรุงศรีอยุธยา",
            NumericCode: "025",
            Aliases: ["BAY", "KRUNGSRI", "KRUNG SRI", "กรุงศรี", "กรุงศรีอยุธยา", "025", "25"]
        ),
        new(
            Code: "GSB",
            OfficialName: "ธนาคารออมสิน",
            DefaultAccountName: "บัญชีธนาคารออมสิน",
            NumericCode: "030",
            Aliases: ["GSB", "GOVERNMENT SAVINGS BANK", "ออมสิน", "030", "30"]
        ),
        new(
            Code: "UOB",
            OfficialName: "ธนาคารยูโอบี",
            DefaultAccountName: "บัญชีธนาคารยูโอบี",
            NumericCode: "024",
            Aliases: ["UOB", "ยูโอบี", "UNITED OVERSEAS", "024", "24"]
        ),
        new(
            Code: "CIMB",
            OfficialName: "ธนาคารซีไอเอ็มบีไทย",
            DefaultAccountName: "บัญชีธนาคารซีไอเอ็มบีไทย",
            NumericCode: "022",
            Aliases: ["CIMB", "CIMBT", "ซีไอเอ็มบี", "ซีไอเอ็มบีไทย", "022", "22"]
        ),
        new(
            Code: "BAAC",
            OfficialName: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
            DefaultAccountName: "บัญชี ธ.ก.ส.",
            NumericCode: "034",
            Aliases: ["BAAC", "ธกส", "ธ.ก.ส.", "เกษตรและสหกรณ์", "034", "34"]
        ),
        new(
            Code: "KKP",
            OfficialName: "ธนาคารเกียรตินาคินภัทร",
            DefaultAccountName: "บัญชีธนาคารเกียรตินาคินภัทร",
            NumericCode: "069",
            Aliases: ["KKP", "KIATNAKIN", "เกียรตินาคิน", "เกียรตินาคินภัทร", "069", "69"]
        ),
        new(
            Code: "TISCO",
            OfficialName: "ธนาคารทิสโก้",
            DefaultAccountName: "บัญชีธนาคารทิสโก้",
            NumericCode: "067",
            Aliases: ["TISCO", "ทิสโก้", "067", "67"]
        ),
        new(
            Code: "LH",
            OfficialName: "ธนาคารแลนด์ แอนด์ เฮ้าส์",
            DefaultAccountName: "บัญชีธนาคารแลนด์ แอนด์ เฮ้าส์",
            NumericCode: "073",
            Aliases: ["LH", "LHBANK", "LAND AND HOUSES", "แลนด์ แอนด์ เฮ้าส์", "แลนด์แอนด์เฮ้าส์", "073", "73"]
        )
    };

    private static readonly Dictionary<string, ThaiBankDefinition> ByCode =
        Banks.ToDictionary(b => b.Code, StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Normalizes any bank-related input (code, English acronym, Thai name, PromptPay code) to canonical BankCode (e.g. "KTB").
    /// </summary>
    public static string? NormalizeBankCode(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;

        var clean = input.Trim();

        // 1. Direct canonical code match
        if (ByCode.TryGetValue(clean, out var exact))
        {
            return exact.Code;
        }

        // 2. Exact match against NumericCode or Aliases
        foreach (var bank in Banks)
        {
            if (string.Equals(bank.NumericCode, clean, StringComparison.OrdinalIgnoreCase))
            {
                return bank.Code;
            }

            foreach (var alias in bank.Aliases)
            {
                if (string.Equals(alias, clean, StringComparison.OrdinalIgnoreCase))
                {
                    return bank.Code;
                }
            }
        }

        // 3. Substring / keyword match (e.g. "ธนาคารกรุงไทย จำกัด", "บัญชีกสิกร")
        var upper = clean.ToUpperInvariant();
        foreach (var bank in Banks)
        {
            if (upper.Contains(bank.Code, StringComparison.OrdinalIgnoreCase))
            {
                return bank.Code;
            }

            foreach (var alias in bank.Aliases)
            {
                // Only consider aliases with 3+ characters to avoid false positive short substrings
                if (alias.Length >= 3 && upper.Contains(alias.ToUpperInvariant(), StringComparison.OrdinalIgnoreCase))
                {
                    return bank.Code;
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Gets bank definition by canonical code.
    /// </summary>
    public static ThaiBankDefinition? GetBank(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        var canonical = NormalizeBankCode(code);
        if (canonical != null && ByCode.TryGetValue(canonical, out var bank))
        {
            return bank;
        }
        return null;
    }

    /// <summary>
    /// Finds a matching active BankAccount from user's accounts based on detected bank code,
    /// checking BankCode, BankName, and AccountName across canonical codes, Thai names, and aliases.
    /// </summary>
    public static BankAccount? FindMatchingAccount(IEnumerable<BankAccount> accounts, string? rawBankCode)
    {
        if (string.IsNullOrWhiteSpace(rawBankCode)) return null;

        var targetCode = NormalizeBankCode(rawBankCode) ?? rawBankCode.Trim().ToUpperInvariant();
        var targetBank = GetBank(targetCode);
        var targetOfficialName = targetBank?.OfficialName;

        var activeAccounts = accounts
            .Where(a => a.IsActive && !a.IsDeleted)
            .ToList();

        if (activeAccounts.Count == 0) return null;

        // Level 1: Match by BankCode (canonical normalization)
        var codeMatch = activeAccounts.FirstOrDefault(a =>
        {
            var accCode = NormalizeBankCode(a.BankCode) ?? a.BankCode?.Trim().ToUpperInvariant();
            return !string.IsNullOrEmpty(accCode) && string.Equals(accCode, targetCode, StringComparison.OrdinalIgnoreCase);
        });
        if (codeMatch != null) return codeMatch;

        // Level 2: Match by BankName (normalized or alias/exact)
        var nameMatch = activeAccounts.FirstOrDefault(a =>
        {
            if (string.IsNullOrWhiteSpace(a.BankName)) return false;
            var accBankCode = NormalizeBankCode(a.BankName);
            if (!string.IsNullOrEmpty(accBankCode) && string.Equals(accBankCode, targetCode, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (!string.IsNullOrEmpty(targetOfficialName) &&
                (a.BankName.Contains(targetOfficialName, StringComparison.OrdinalIgnoreCase) ||
                 targetOfficialName.Contains(a.BankName, StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }

            return false;
        });
        if (nameMatch != null) return nameMatch;

        // Level 3: Match by AccountName (e.g. user named it "บัญชีกรุงไทย" or "KTB Saving")
        var accountNameMatch = activeAccounts.FirstOrDefault(a =>
        {
            if (string.IsNullOrWhiteSpace(a.AccountName)) return false;
            var accNameBankCode = NormalizeBankCode(a.AccountName);
            if (!string.IsNullOrEmpty(accNameBankCode) && string.Equals(accNameBankCode, targetCode, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (!string.IsNullOrEmpty(targetOfficialName) &&
                a.AccountName.Contains(targetOfficialName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            return false;
        });
        if (accountNameMatch != null) return accountNameMatch;

        return null;
    }
}
