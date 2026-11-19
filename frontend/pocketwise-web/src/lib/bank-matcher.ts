import type { BankAccountResponse } from "@/types/bank-account.types";

export interface ThaiBankOption {
  code: string;
  name: string;
  numericCode: string;
}

export const THAI_BANKS: ThaiBankOption[] = [
  { code: "KBANK", name: "ธนาคารกสิกรไทย", numericCode: "004" },
  { code: "SCB", name: "ธนาคารไทยพาณิชย์", numericCode: "014" },
  { code: "KTB", name: "ธนาคารกรุงไทย", numericCode: "006" },
  { code: "BBL", name: "ธนาคารกรุงเทพ", numericCode: "002" },
  { code: "TTB", name: "ธนาคารทหารไทยธนชาต", numericCode: "011" },
  { code: "BAY", name: "ธนาคารกรุงศรีอยุธยา", numericCode: "025" },
  { code: "GSB", name: "ธนาคารออมสิน", numericCode: "030" },
  { code: "UOB", name: "ธนาคารยูโอบี", numericCode: "024" },
  { code: "CIMB", name: "ธนาคารซีไอเอ็มบีไทย", numericCode: "022" },
  { code: "BAAC", name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)", numericCode: "034" },
  { code: "KKP", name: "ธนาคารเกียรตินาคินภัทร", numericCode: "069" },
  { code: "TISCO", name: "ธนาคารทิสโก้", numericCode: "067" },
  { code: "LH", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์", numericCode: "073" },
];

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
 * Infers canonical bank code from freeform text (Thai name, English acronym, or PromptPay code).
 */
export function inferBankCode(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.trim().toLowerCase();

  // PromptPay numeric codes
  if (t === "004" || t === "04") return "KBANK";
  if (t === "014" || t === "14") return "SCB";
  if (t === "006" || t === "06") return "KTB";
  if (t === "002" || t === "02") return "BBL";
  if (t === "011" || t === "11") return "TTB";
  if (t === "025" || t === "25") return "BAY";
  if (t === "030" || t === "30") return "GSB";
  if (t === "024" || t === "24") return "UOB";
  if (t === "022" || t === "22") return "CIMB";
  if (t === "034" || t === "34") return "BAAC";
  if (t === "069" || t === "69") return "KKP";
  if (t === "067" || t === "67") return "TISCO";
  if (t === "073" || t === "73") return "LH";

  // Thai and English keywords
  if (t.includes("kbank") || t.includes("กสิกร") || t.includes("kasikorn")) return "KBANK";
  if (t.includes("scb") || t.includes("ไทยพาณิชย์") || t.includes("siam commercial")) return "SCB";
  if (t.includes("ktb") || t.includes("กรุงไทย") || t.includes("krungthai")) return "KTB";
  if (t.includes("bbl") || t.includes("กรุงเทพ") || t.includes("bangkok bank")) return "BBL";
  if (t.includes("ttb") || t.includes("tmb") || t.includes("thanachart") || t.includes("ทหารไทย") || t.includes("ธนชาต")) return "TTB";
  if (t.includes("bay") || t.includes("กรุงศรี") || t.includes("krungsri")) return "BAY";
  if (t.includes("gsb") || t.includes("ออมสิน") || t.includes("savings bank")) return "GSB";
  if (t.includes("uob") || t.includes("ยูโอบี")) return "UOB";
  if (t.includes("cimb") || t.includes("ซีไอเอ็มบี")) return "CIMB";
  if (t.includes("baac") || t.includes("ธกส") || t.includes("ธ.ก.ส") || t.includes("เกษตรและสหกรณ์")) return "BAAC";
  if (t.includes("kkp") || t.includes("เกียรตินาคิน") || t.includes("kiatnakin")) return "KKP";
  if (t.includes("tisco") || t.includes("ทิสโก้")) return "TISCO";
  if (t.includes("lh") || t.includes("แลนด์") || t.includes("land and house")) return "LH";

  return null;
}

/**
 * Normalizes a bank code string into a canonical representation (trimmed, uppercase, mapped).
 */
export function normalizeBankCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const inferred = inferBankCode(code);
  if (inferred) return inferred;

  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return null;
  return BANK_ALIASES[clean] || clean;
}

/**
 * Finds a matching bank account from the user's accounts list based on bankCode.
 * Returns the matching BankAccountResponse if found, or null if no account matches.
 * Checks bankCode, bankName, and accountName across canonical codes and Thai keywords.
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

  // 2. Match on account.bankName (e.g. user typed "KTB" or "ธนาคารกรุงไทย" as bankName)
  for (const account of activeAccounts) {
    const normalizedNameCode = normalizeBankCode(account.bankName);
    if (normalizedNameCode && normalizedNameCode === normalizedSlipCode) {
      return account;
    }
  }

  // 3. Match on account.accountName (e.g. "กรุงไทยเงินเดือน", "KTB Saving")
  for (const account of activeAccounts) {
    const normalizedAccountNameCode = normalizeBankCode(account.accountName);
    if (normalizedAccountNameCode && normalizedAccountNameCode === normalizedSlipCode) {
      return account;
    }
  }

  // 4. Fallback: Exact trimmed raw match on account.bankCode (for custom codes)
  const rawSlip = slipBankCode?.trim().toUpperCase();
  for (const account of activeAccounts) {
    const rawAccount = account.bankCode?.trim().toUpperCase();
    if (rawAccount && rawAccount === rawSlip) {
      return account;
    }
  }

  return null;
}
