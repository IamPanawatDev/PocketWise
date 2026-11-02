import type { BankAccountResponse } from "@/types/bank-account.types";

/**
 * Standard Bank Code Dictionary (PromptPay & Thai Commercial Banks)
 * Maps aliases, 3-digit numeric codes, 2-digit codes, and English acronyms to a canonical key.
 */
const BANK_ALIASES: Record<string, string> = {
  // KBANK - Kasikornbank
  "004": "KBANK",
  "04": "KBANK",
  "KBANK": "KBANK",
  "KASIKORN": "KBANK",
  "KASIKORNBANK": "KBANK",

  // SCB - Siam Commercial Bank
  "014": "SCB",
  "14": "SCB",
  "SCB": "SCB",
  "SIAMCOMMERCIAL": "SCB",

  // KTB - Krungthai Bank
  "006": "KTB",
  "06": "KTB",
  "KTB": "KTB",
  "KRUNGTHAI": "KTB",

  // BBL - Bangkok Bank
  "002": "BBL",
  "02": "BBL",
  "BBL": "BBL",
  "BANGKOKBANK": "BBL",

  // TTB - TMBThanachart Bank
  "011": "TTB",
  "11": "TTB",
  "TTB": "TTB",
  "TMB": "TTB",
  "THANACHART": "TTB",

  // BAY - Bank of Ayudhya (Krungsri)
  "025": "BAY",
  "25": "BAY",
  "BAY": "BAY",
  "KRUNGSRI": "BAY",

  // GSB - Government Savings Bank
  "030": "GSB",
  "30": "GSB",
  "GSB": "GSB",

  // UOB - United Overseas Bank
  "024": "UOB",
  "24": "UOB",
  "UOB": "UOB",

  // CIMB - CIMB Thai
  "022": "CIMB",
  "22": "CIMB",
  "CIMB": "CIMB",
  "CIMBT": "CIMB",

  // BAAC - Bank for Agriculture and Agricultural Cooperatives
  "034": "BAAC",
  "34": "BAAC",
  "BAAC": "BAAC",

  // KKP - Kiatnakin Phatra Bank
  "069": "KKP",
  "69": "KKP",
  "KKP": "KKP",
  "KIATNAKIN": "KKP",

  // TISCO - Tisco Bank
  "067": "TISCO",
  "67": "TISCO",
  "TISCO": "TISCO",

  // LH - Land and Houses Bank
  "073": "LH",
  "73": "LH",
  "LH": "LH",
  "LHBANK": "LH",
};

/**
 * Normalizes a bank code string into a canonical representation (trimmed, uppercase, mapped).
 */
export function normalizeBankCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return null;
  return BANK_ALIASES[clean] || clean;
}

/**
 * Finds a matching bank account from the user's accounts list based on bankCode.
 * Returns the matching BankAccountResponse if found, or null if no account matches.
 */
export function findMatchingBankAccount(
  slipBankCode: string | null | undefined,
  accounts: BankAccountResponse[]
): BankAccountResponse | null {
  const normalizedSlipCode = normalizeBankCode(slipBankCode);
  if (!normalizedSlipCode || !accounts || accounts.length === 0) return null;

  // Filter only active accounts
  const activeAccounts = accounts.filter((a) => a.isActive !== false);

  // 1. Direct or canonical normalized match on account.bankCode
  for (const account of activeAccounts) {
    const normalizedAccountCode = normalizeBankCode(account.bankCode);
    if (normalizedAccountCode && normalizedAccountCode === normalizedSlipCode) {
      return account;
    }
  }

  // 2. Fallback: Exact trimmed raw match on account.bankCode (for custom codes)
  const rawSlip = slipBankCode?.trim().toUpperCase();
  for (const account of activeAccounts) {
    const rawAccount = account.bankCode?.trim().toUpperCase();
    if (rawAccount && rawAccount === rawSlip) {
      return account;
    }
  }

  return null;
}
