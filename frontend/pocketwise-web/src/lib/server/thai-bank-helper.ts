export interface ThaiBankDefinition {
  code: string;
  officialName: string;
  defaultAccountName: string;
  numericCode: string;
  aliases: string[];
}

export const THAI_BANKS: ThaiBankDefinition[] = [
  {
    code: "KBANK",
    officialName: "ธนาคารกสิกรไทย",
    defaultAccountName: "บัญชีธนาคารกสิกรไทย",
    numericCode: "004",
    aliases: ["KBANK", "KASIKORN", "KASIKORNBANK", "กสิกร", "กสิกรไทย", "004", "04"],
  },
  {
    code: "SCB",
    officialName: "ธนาคารไทยพาณิชย์",
    defaultAccountName: "บัญชีธนาคารไทยพาณิชย์",
    numericCode: "014",
    aliases: ["SCB", "SIAMCOMMERCIAL", "ไทยพาณิชย์", "014", "14"],
  },
  {
    code: "KTB",
    officialName: "ธนาคารกรุงไทย",
    defaultAccountName: "บัญชีธนาคารกรุงไทย",
    numericCode: "006",
    aliases: ["KTB", "KRUNGTHAI", "KRUNG THAI", "กรุงไทย", "006", "06"],
  },
  {
    code: "BBL",
    officialName: "ธนาคารกรุงเทพ",
    defaultAccountName: "บัญชีธนาคารกรุงเทพ",
    numericCode: "002",
    aliases: ["BBL", "BANGKOK", "BANGKOKBANK", "กรุงเทพ", "002", "02"],
  },
  {
    code: "TTB",
    officialName: "ธนาคารทหารไทยธนชาต",
    defaultAccountName: "บัญชีธนาคารทหารไทยธนชาต",
    numericCode: "011",
    aliases: ["TTB", "TMB", "THANACHART", "ทหารไทย", "ธนชาต", "ทหารไทยธนชาต", "011", "11"],
  },
  {
    code: "BAY",
    officialName: "ธนาคารกรุงศรีอยุธยา",
    defaultAccountName: "บัญชีธนาคารกรุงศรีอยุธยา",
    numericCode: "025",
    aliases: ["BAY", "KRUNGSRI", "KRUNG SRI", "กรุงศรี", "กรุงศรีอยุธยา", "025", "25"],
  },
  {
    code: "GSB",
    officialName: "ธนาคารออมสิน",
    defaultAccountName: "บัญชีธนาคารออมสิน",
    numericCode: "030",
    aliases: ["GSB", "GOVERNMENT SAVINGS BANK", "ออมสิน", "030", "30"],
  },
  {
    code: "UOB",
    officialName: "ธนาคารยูโอบี",
    defaultAccountName: "บัญชีธนาคารยูโอบี",
    numericCode: "024",
    aliases: ["UOB", "ยูโอบี", "UNITED OVERSEAS", "024", "24"],
  },
  {
    code: "CIMB",
    officialName: "ธนาคารซีไอเอ็มบีไทย",
    defaultAccountName: "บัญชีธนาคารซีไอเอ็มบีไทย",
    numericCode: "022",
    aliases: ["CIMB", "CIMBT", "ซีไอเอ็มบี", "ซีไอเอ็มบีไทย", "022", "22"],
  },
  {
    code: "LH",
    officialName: "ธนาคารแลนด์ แอนด์ เฮ้าส์",
    defaultAccountName: "บัญชีธนาคารแลนด์ แอนด์ เฮ้าส์",
    numericCode: "073",
    aliases: ["LH", "LHBANK", "LAND AND HOUSES", "แลนด์ แอนด์ เฮ้าส์", "แลนด์แอนด์เฮ้าส์", "073", "73"],
  },
];

const BY_CODE = new Map<string, ThaiBankDefinition>();
for (const b of THAI_BANKS) {
  BY_CODE.set(b.code.toUpperCase(), b);
}

export function normalizeBankCode(input?: string | null): string | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim().toUpperCase();

  // 1. Direct canonical code match
  if (BY_CODE.has(clean)) {
    return BY_CODE.get(clean)!.code;
  }

  // 2. Exact match against NumericCode or Aliases
  for (const bank of THAI_BANKS) {
    if (bank.numericCode.toUpperCase() === clean) {
      return bank.code;
    }
    for (const alias of bank.aliases) {
      if (alias.toUpperCase() === clean) {
        return bank.code;
      }
    }
  }

  // 3. Substring match against Thai Name / OfficialName
  for (const bank of THAI_BANKS) {
    if (bank.officialName.includes(input.trim())) {
      return bank.code;
    }
    for (const alias of bank.aliases) {
      if (input.includes(alias)) {
        return bank.code;
      }
    }
  }

  return clean;
}

export function getBank(code?: string | null): ThaiBankDefinition | null {
  if (!code || !code.trim()) return null;
  const canonical = normalizeBankCode(code);
  if (canonical && BY_CODE.has(canonical.toUpperCase())) {
    return BY_CODE.get(canonical.toUpperCase())!;
  }
  return null;
}

export interface AccountCandidate {
  bankAccountId: number;
  accountName: string;
  bankCode?: string | null;
  bankName?: string | null;
}

export function findMatchingAccount<T extends AccountCandidate>(
  accounts: T[],
  rawBankCode?: string | null,
): T | null {
  if (!rawBankCode || !rawBankCode.trim() || accounts.length === 0) return null;

  const targetCode = normalizeBankCode(rawBankCode)?.toUpperCase();
  const targetBank = getBank(rawBankCode);

  // 1. Match by BankCode
  if (targetCode) {
    const match = accounts.find(
      (a) => a.bankCode && normalizeBankCode(a.bankCode)?.toUpperCase() === targetCode,
    );
    if (match) return match;
  }

  // 2. Match by AccountName or BankName containing bank acronym or Thai name
  if (targetBank) {
    const match = accounts.find((a) => {
      const accName = a.accountName.toLowerCase();
      const bName = (a.bankName || "").toLowerCase();
      return (
        accName.includes(targetBank.code.toLowerCase()) ||
        accName.includes(targetBank.officialName.toLowerCase()) ||
        bName.includes(targetBank.code.toLowerCase()) ||
        bName.includes(targetBank.officialName.toLowerCase())
      );
    });
    if (match) return match;
  }

  return null;
}

export const ThaiBankHelper = {
  banks: THAI_BANKS,
  normalizeBankCode,
  getBank,
  findMatchingAccount,
};

