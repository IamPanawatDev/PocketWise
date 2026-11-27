import { ValidationErrorAppError } from "../../api-error";

export type StatementItemType =
  | "Purchase"
  | "Installment"
  | "Interest"
  | "Cashback"
  | "Fee"
  | "Payment";

export interface ParsedStatementItem {
  transactionDate: string; // YYYY-MM-DD
  description: string;
  amount: number;
  itemType: StatementItemType;
  externalReference?: string | null;
}

export interface ParsedStatementData {
  statementDate: string; // YYYY-MM-DD
  statementPeriodStart?: string | null; // YYYY-MM-DD
  statementPeriodEnd?: string | null; // YYYY-MM-DD
  paymentDueDate?: string | null; // YYYY-MM-DD
  previousBalance: number;
  purchaseAmount: number;
  installmentAmount: number;
  interestAmount: number;
  cashbackAmount: number;
  paymentAmount: number;
  totalDue: number;
  items: ParsedStatementItem[];
}

export class StatementParserService {
  /**
   * Parse uploaded statement file (CSV or JSON)
   */
  public static async parseStatement(
    buffer: Buffer | ArrayBuffer,
    fileName: string,
    format?: string | null,
  ): Promise<ParsedStatementData> {
    const ext = fileName.includes(".")
      ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
      : "";
    const isJson =
      format?.toLowerCase() === "json" || ext === ".json";
    const isCsv =
      format?.toLowerCase() === "csv" || ext === ".csv";

    if (!isJson && !isCsv) {
      throw new ValidationErrorAppError(
        "รองรับเฉพาะไฟล์รูปแบบ CSV (.csv) หรือ JSON (.json) เท่านั้น",
      );
    }

    const content = Buffer.isBuffer(buffer)
      ? buffer.toString("utf-8")
      : Buffer.from(buffer).toString("utf-8");

    if (isJson) {
      return this.parseJson(content);
    }

    return this.parseCsv(content);
  }

  /**
   * Parse JSON statement
   */
  public static parseJson(content: string): ParsedStatementData {
    let json: any;
    try {
      json = JSON.parse(content);
    } catch {
      throw new ValidationErrorAppError("รูปแบบไฟล์ JSON ไม่ถูกต้อง");
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const result: ParsedStatementData = {
      statementDate: this.normalizeDate(json.statementDate) || todayIso,
      statementPeriodStart: this.normalizeDate(json.statementPeriodStart) || null,
      statementPeriodEnd: this.normalizeDate(json.statementPeriodEnd) || null,
      paymentDueDate: this.normalizeDate(json.paymentDueDate) || null,
      previousBalance: Number(json.previousBalance) || 0,
      purchaseAmount: Number(json.purchaseAmount) || 0,
      installmentAmount: Number(json.installmentAmount) || 0,
      interestAmount: Number(json.interestAmount) || 0,
      cashbackAmount: Number(json.cashbackAmount) || 0,
      paymentAmount: Number(json.paymentAmount) || 0,
      totalDue: Number(json.totalDue) || 0,
      items: [],
    };

    if (Array.isArray(json.items)) {
      for (const itemElem of json.items) {
        const amt = Math.abs(Number(itemElem.amount) || 0);
        if (amt > 0) {
          result.items.push({
            transactionDate:
              this.normalizeDate(itemElem.transactionDate) || result.statementDate,
            description: (itemElem.description || "").trim() || "รายการบัตรเครดิต",
            amount: amt,
            itemType: this.parseItemType(itemElem.itemType),
            externalReference: itemElem.externalReference
              ? String(itemElem.externalReference).trim()
              : null,
          });
        }
      }
    }

    this.recalculateTotalsIfMissing(result);
    return result;
  }

  /**
   * Parse CSV statement
   */
  public static parseCsv(content: string): ParsedStatementData {
    const rawLines = content.split(/\r?\n/);
    const lines: string[] = [];

    for (const line of rawLines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        lines.push(trimmed);
      }
    }

    if (lines.length === 0) {
      throw new ValidationErrorAppError("ไฟล์ CSV ว่างเปล่า");
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const result: ParsedStatementData = {
      statementDate: todayIso,
      statementPeriodStart: null,
      statementPeriodEnd: null,
      paymentDueDate: null,
      previousBalance: 0,
      purchaseAmount: 0,
      installmentAmount: 0,
      interestAmount: 0,
      cashbackAmount: 0,
      paymentAmount: 0,
      totalDue: 0,
      items: [],
    };

    // Extract leading metadata comments (# key: value)
    for (const l of lines) {
      if (l.startsWith("#")) {
        const comment = l.slice(1).trim();
        const colonIdx = comment.indexOf(":");
        if (colonIdx > 0) {
          const key = comment.slice(0, colonIdx).trim().toLowerCase();
          const val = comment.slice(colonIdx + 1).trim();
          const parsedD = this.normalizeDate(val);
          if (parsedD) {
            if (key.includes("due_date") || key.includes("due")) {
              result.paymentDueDate = parsedD;
            } else if (key.includes("period_start") || key.includes("start")) {
              result.statementPeriodStart = parsedD;
            } else if (key.includes("period_end") || key.includes("end")) {
              result.statementPeriodEnd = parsedD;
            } else if (key.includes("statement_date") || key === "date") {
              result.statementDate = parsedD;
            }
          }
        }
      }
    }

    // Determine header indices
    let dateIdx = -1;
    let descIdx = -1;
    let amtIdx = -1;
    let typeIdx = -1;
    let refIdx = -1;
    let startIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("#")) continue;

      const cols = this.parseCsvRow(lines[i]);
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c].trim().toLowerCase();
        if (col.includes("date") || col.includes("วันที่")) dateIdx = c;
        else if (
          col.includes("desc") ||
          col.includes("รายการ") ||
          col.includes("description")
        )
          descIdx = c;
        else if (
          col.includes("amount") ||
          col.includes("จำนวนเงิน") ||
          col.includes("ยอดเงิน")
        )
          amtIdx = c;
        else if (col.includes("type") || col.includes("ประเภท")) typeIdx = c;
        else if (col.includes("ref") || col.includes("อ้างอิง")) refIdx = c;
      }

      if (dateIdx !== -1 && amtIdx !== -1) {
        startIndex = i + 1;
        break;
      }
    }

    if (dateIdx === -1 || amtIdx === -1) {
      // Default columns fallback: 0 = Date, 1 = Description, 2 = Amount, 3 = Type, 4 = Ref
      dateIdx = 0;
      descIdx = 1;
      amtIdx = 2;
      typeIdx = 3;
      refIdx = 4;
      startIndex = 0;
    }

    for (let i = startIndex; i < lines.length; i++) {
      if (lines[i].startsWith("#")) continue;

      const cols = this.parseCsvRow(lines[i]);
      if (cols.length <= Math.max(dateIdx, amtIdx)) continue;

      const amtRaw = cols[amtIdx].replace(/,/g, "").trim();
      const amount = Math.abs(parseFloat(amtRaw));
      if (isNaN(amount) || amount <= 0) continue;

      const dateRaw = cols[dateIdx]?.trim();
      const date = this.normalizeDate(dateRaw) || result.statementDate;

      const desc =
        descIdx >= 0 && descIdx < cols.length
          ? cols[descIdx].trim() || "รายการบัตรเครดิต"
          : "รายการบัตรเครดิต";

      const itemType =
        typeIdx >= 0 && typeIdx < cols.length
          ? this.parseItemType(cols[typeIdx].trim())
          : "Purchase";

      const extRef =
        refIdx >= 0 && refIdx < cols.length ? cols[refIdx].trim() : null;

      result.items.push({
        transactionDate: date,
        description: desc,
        amount,
        itemType,
        externalReference: extRef && extRef.length > 0 ? extRef : null,
      });
    }

    this.recalculateTotalsIfMissing(result);
    return result;
  }

  /**
   * Parse CSV row with quoted field handling
   */
  public static parseCsvRow(row: string): string[] {
    const cols: string[] = [];
    let inQuotes = false;
    let current = "";

    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  }

  /**
   * Parse item type from string
   */
  public static parseItemType(text?: string | null): StatementItemType {
    if (!text) return "Purchase";
    const t = text.trim().toLowerCase();
    if (t.includes("installment") || t.includes("ผ่อน")) return "Installment";
    if (t.includes("interest") || t.includes("ดอกเบี้ย")) return "Interest";
    if (t.includes("cashback") || t.includes("เงินคืน")) return "Cashback";
    if (t.includes("fee") || t.includes("ค่าธรรมเนียม")) return "Fee";
    if (t.includes("payment") || t.includes("ชำระ") || t.includes("จ่าย"))
      return "Payment";
    return "Purchase";
  }

  /**
   * Recalculate totals and period dates if missing
   */
  private static recalculateTotalsIfMissing(data: ParsedStatementData): void {
    if (data.items.length > 0) {
      const dates = data.items.map((i) => i.transactionDate).sort();
      if (!data.statementPeriodStart) {
        data.statementPeriodStart = dates[0];
      }
      if (!data.statementPeriodEnd) {
        data.statementPeriodEnd = dates[dates.length - 1];
      }
      if (!data.statementDate) {
        data.statementDate = data.statementPeriodEnd;
      }
      if (!data.paymentDueDate) {
        const d = new Date(data.statementDate);
        d.setDate(d.getDate() + 15);
        data.paymentDueDate = d.toISOString().slice(0, 10);
      }

      if (data.purchaseAmount === 0) {
        data.purchaseAmount = data.items
          .filter((i) => i.itemType === "Purchase")
          .reduce((sum, i) => sum + i.amount, 0);
      }

      if (data.installmentAmount === 0) {
        data.installmentAmount = data.items
          .filter((i) => i.itemType === "Installment")
          .reduce((sum, i) => sum + i.amount, 0);
      }

      if (data.interestAmount === 0) {
        data.interestAmount = data.items
          .filter((i) => i.itemType === "Interest")
          .reduce((sum, i) => sum + i.amount, 0);
      }

      if (data.cashbackAmount === 0) {
        data.cashbackAmount = data.items
          .filter((i) => i.itemType === "Cashback")
          .reduce((sum, i) => sum + i.amount, 0);
      }

      if (data.paymentAmount === 0) {
        data.paymentAmount = data.items
          .filter((i) => i.itemType === "Payment")
          .reduce((sum, i) => sum + i.amount, 0);
      }

      if (data.totalDue === 0) {
        const charges = data.items
          .filter((i) => i.itemType !== "Payment" && i.itemType !== "Cashback")
          .reduce((sum, i) => sum + i.amount, 0);
        const credits = data.items
          .filter((i) => i.itemType === "Payment" || i.itemType === "Cashback")
          .reduce((sum, i) => sum + i.amount, 0);
        data.totalDue = Math.max(0, data.previousBalance + charges - credits);
      }
    } else {
      const todayIso = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fifteenDaysAhead = new Date();
      fifteenDaysAhead.setDate(fifteenDaysAhead.getDate() + 15);

      if (!data.statementDate) data.statementDate = todayIso;
      if (!data.statementPeriodStart)
        data.statementPeriodStart = thirtyDaysAgo.toISOString().slice(0, 10);
      if (!data.statementPeriodEnd) data.statementPeriodEnd = todayIso;
      if (!data.paymentDueDate)
        data.paymentDueDate = fifteenDaysAhead.toISOString().slice(0, 10);
    }
  }

  /**
   * Helper to normalize date strings to YYYY-MM-DD
   */
  public static normalizeDate(raw?: string | null): string | null {
    if (!raw) return null;
    const s = raw.trim();
    if (!s) return null;

    // YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      let year = parseInt(isoMatch[1], 10);
      if (year > 2500) year -= 543;
      const m = String(parseInt(isoMatch[2], 10)).padStart(2, "0");
      const d = String(parseInt(isoMatch[3], 10)).padStart(2, "0");
      return `${year}-${m}-${d}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      let year = parseInt(dmyMatch[3], 10);
      if (year > 2500) year -= 543;
      const m = String(parseInt(dmyMatch[2], 10)).padStart(2, "0");
      const d = String(parseInt(dmyMatch[1], 10)).padStart(2, "0");
      return `${year}-${m}-${d}`;
    }

    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      let year = parsed.getUTCFullYear();
      if (year > 2500) year -= 543;
      const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const d = String(parsed.getUTCDate()).padStart(2, "0");
      return `${year}-${m}-${d}`;
    }

    return null;
  }
}
