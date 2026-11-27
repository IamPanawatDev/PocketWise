import { serverConfig } from "../../config";
import { AppError } from "../../api-error";
import { ThaiBankHelper } from "../../thai-bank-helper";

export interface SlipExtractedData {
  bankCode: string | null;
  payerName: string | null;
  payeeName: string | null;
  detectedAmount: number | null;
  detectedAt: Date | null;
  transactionReference: string | null;
  rawText: string;
  ocrProvider: string;
  ocrEngine: string;
  processingDurationSeconds: number;
}

const ThaiDateRegex =
  /([0-3]?\d)\s*([ก-๙\.]+)\s*(25\d{2}|20\d{2}|\b[56]\d\b)[^\d]*([0-2]?\d)[:.]([0-5]\d)(?:[:.]([0-5]\d))?/;

export class GeminiOcrService {
  /**
   * Extract transaction data from bank slip image/PDF using Google Gemini Flash API.
   */
  public async extractData(
    imageBuffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<SlipExtractedData> {
    const startTime = Date.now();
    const apiKey = serverConfig.ocr.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new AppError(
        "AI_SERVICE_UNAVAILABLE",
        "ระบบ AI สำหรับอ่านสลิปยังไม่ได้ตั้งค่า API Key (GEMINI_API_KEY) กรุณาติดต่อผู้ดูแลระบบ",
        503,
      );
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "ไม่พบข้อมูลไฟล์รูปภาพสำหรับอ่านข้อมูล",
        400,
      );
    }

    const mimeType = this.normalizeMimeType(contentType, fileName);
    const base64Data = imageBuffer.toString("base64");

    const candidateModels = [
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
    ];

    let lastErrorReason: string | undefined;

    for (const model of candidateModels) {
      try {
        const { result, error } = await this.tryAnalyzeWithGemini(
          apiKey,
          model,
          base64Data,
          mimeType,
        );

        if (error) {
          lastErrorReason = error;
        }

        if (
          result &&
          (result.detectedAmount !== null ||
            Boolean(result.transactionReference))
        ) {
          const durationSeconds = Number(
            ((Date.now() - startTime) / 1000).toFixed(2),
          );
          result.ocrProvider = "AI";
          result.ocrEngine = `Gemini (${model})`;
          result.processingDurationSeconds = durationSeconds;
          return result;
        }
      } catch (err: unknown) {
        lastErrorReason = err instanceof Error ? err.message : String(err);
        console.warn(`[GeminiOcrService] Model ${model} failed:`, err);
      }
    }

    throw new AppError(
      "AI_EXTRACTION_FAILED",
      `ระบบ AI ไม่สามารถอ่านข้อมูลสำคัญจากสลิปนี้ได้${lastErrorReason ? ` (${lastErrorReason})` : " กรุณาตรวจสอบความคมชัดของรูปภาพ หรือลองใหม่อีกครั้ง"}`,
      422,
    );
  }

  private async tryAnalyzeWithGemini(
    apiKey: string,
    model: string,
    base64Data: string,
    mimeType: string,
  ): Promise<{ result: SlipExtractedData | null; error?: string }> {
    const modelClean = model.startsWith("models/")
      ? model.slice("models/".length)
      : model;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelClean}:generateContent?key=${apiKey}`;

    const prompt = `คุณคือผู้เชี่ยวชาญการอ่านสลิปโอนเงินธนาคารของประเทศไทย
กรุณาวิเคราะห์รูปภาพสลิปที่แนบมานี้อย่างละเอียด และส่งข้อมูลกลับมาเป็น JSON ตามโครงสร้างนี้เท่านั้น:
{
  "bankCode": "KBANK" | "SCB" | "KTB" | "BBL" | "TTB" | "BAY" | "GSB" | "UOB" | "CIMB" | null,
  "payerName": "ชื่อผู้โอน หรือ บัญชีต้นทาง (From/จาก)",
  "payeeName": "ชื่อผู้รับ หรือ บัญชีปลายทาง หรือ ชื่อร้านค้า (To/ไปยัง)",
  "amount": 0.00,
  "transactionDate": "YYYY-MM-DDTHH:mm:ss",
  "transactionReference": "รหัสอ้างอิง หรือ Transaction ID หรือ Ref",
  "rawText": "ข้อความสรุปสำคัญทั้งหมดบนสลิป"
}

ข้อกำหนดสำคัญ:
- bankCode ให้ระบุเป็นตัวย่อมาตรฐานของธนาคารไทยเท่านั้น (KBANK, SCB, KTB, BBL, TTB, BAY, GSB, UOB, CIMB)
- amount ต้องเป็นตัวเลขเท่านั้น (เช่น 1070 หรือ 1070.50)
- หากมีปี พ.ศ. เช่น 2567 หรือ 2569 ให้แปลงเป็นปี ค.ศ. เช่น 2024 หรือ 2026
- ตอบเป็น JSON ล้วนๆ ห้ามใส่คำอธิบายอื่นนอกเหนือจาก JSON`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.warn(
          `[GeminiOcrService] Model ${modelClean} returned HTTP ${res.status}:`,
          errorText,
        );
        return {
          result: null,
          error: `Google API HTTP ${res.status} (${errorText.slice(0, 120)})`,
        };
      }

      const json = await res.json();
      return { result: this.parseGeminiResponse(json) };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[GeminiOcrService] Model ${modelClean} fetch error:`, msg);
      return { result: null, error: msg };
    } finally {
      clearTimeout(timeout);
    }
  }

  public parseGeminiResponse(responseJson: unknown): SlipExtractedData | null {
    try {
      const json = responseJson as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const candidate = json.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;
      if (!text) return null;

      let rawJson = text.trim();
      if (rawJson.startsWith("```json")) {
        rawJson = rawJson.slice(7);
      } else if (rawJson.startsWith("```")) {
        rawJson = rawJson.slice(3);
      }
      if (rawJson.endsWith("```")) {
        rawJson = rawJson.slice(0, -3);
      }
      rawJson = rawJson.trim();

      const parsed = JSON.parse(rawJson);

      const detectedAmount = this.parseAmount(parsed.amount ?? parsed.detectedAmount);
      const rawBank = parsed.bankCode ? String(parsed.bankCode).trim() : null;
      const bankCode = rawBank ? ThaiBankHelper.normalizeBankCode(rawBank) ?? rawBank.toUpperCase() : null;
      const detectedAt = this.parseSlipDateToUtc(parsed.transactionDate ?? parsed.detectedAt);

      return {
        bankCode,
        payerName: this.cleanName(parsed.payerName),
        payeeName: this.cleanName(parsed.payeeName),
        detectedAmount,
        detectedAt,
        transactionReference: this.cleanName(parsed.transactionReference ?? parsed.referenceNo),
        rawText: typeof parsed.rawText === "string" ? parsed.rawText : rawJson,
        ocrProvider: "AI",
        ocrEngine: "Gemini",
        processingDurationSeconds: 0,
      };
    } catch {
      return null;
    }
  }

  private parseAmount(val: unknown): number | null {
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/,/g, "").trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  public parseSlipDateToUtc(dateStr: unknown): Date | null {
    if (typeof dateStr !== "string" || !dateStr.trim()) return null;
    const str = dateStr.trim();

    // 1. Try standard / ISO parsing
    const standardDate = new Date(str);
    if (!isNaN(standardDate.getTime())) {
      let year = standardDate.getFullYear();
      if (year >= 2500 && year <= 2600) {
        year -= 543;
      }
      // If no explicit timezone offset, interpret as Asia/Bangkok (UTC+7)
      if (!str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
        const d = new Date(
          Date.UTC(
            year,
            standardDate.getMonth(),
            standardDate.getDate(),
            standardDate.getHours() - 7,
            standardDate.getMinutes(),
            standardDate.getSeconds(),
          ),
        );
        return d;
      }
      return standardDate;
    }

    // 2. Try Thai Date Regex (e.g. "18 ต.ค. 2569 - 16:04")
    const match = ThaiDateRegex.exec(str);
    if (match) {
      const day = parseInt(match[1], 10);
      let year = parseInt(match[3], 10);
      const month = this.parseThaiMonth(match[2]);

      if (month > 0 && day > 0) {
        if (year >= 2500 && year <= 2600) year -= 543;
        else if (year >= 50 && year <= 99) year += 1957;
        else if (year >= 20 && year <= 49) year += 2000;

        const hour = match[4] ? parseInt(match[4], 10) : 0;
        const minute = match[5] ? parseInt(match[5], 10) : 0;
        const second = match[6] ? parseInt(match[6], 10) : 0;

        return new Date(
          Date.UTC(year, month - 1, day, hour - 7, minute, second),
        );
      }
    }

    return null;
  }

  private parseThaiMonth(thaiMonth: string): number {
    if (!thaiMonth) return 0;
    const clean = thaiMonth.trim().toLowerCase().replace(/\./g, "");

    if (clean.startsWith("มค") || clean.startsWith("มกรา")) return 1;
    if (clean.startsWith("กพ") || clean.startsWith("กุมภา")) return 2;
    if (clean.startsWith("มีค") || clean.startsWith("มีนา")) return 3;
    if (clean.startsWith("เมย") || clean.startsWith("เมษา")) return 4;
    if (clean.startsWith("พค") || clean.startsWith("พฤษภา")) return 5;
    if (clean.startsWith("มิย") || clean.startsWith("มิถุนา")) return 6;
    if (clean.startsWith("กค") || clean.startsWith("กรกฎา")) return 7;
    if (clean.startsWith("สค") || clean.startsWith("สิงหา")) return 8;
    if (clean.startsWith("กย") || clean.startsWith("กันยา")) return 9;
    if (clean.startsWith("ตค") || clean.startsWith("ตุลา")) return 10;
    if (clean.startsWith("พย") || clean.startsWith("พฤศจิกา")) return 11;
    if (clean.startsWith("ธค") || clean.startsWith("ธันวา")) return 12;

    return 0;
  }

  private normalizeMimeType(contentType: string, fileName: string): string {
    if (contentType && contentType.includes("/")) {
      const clean = contentType.split(";")[0].trim().toLowerCase();
      if (
        clean === "image/jpeg" ||
        clean === "image/jpg" ||
        clean === "image/png" ||
        clean === "image/webp" ||
        clean === "application/pdf"
      ) {
        return clean === "image/jpg" ? "image/jpeg" : clean;
      }
    }

    const ext = fileName.toLowerCase().split(".").pop();
    switch (ext) {
      case "png":
        return "image/png";
      case "webp":
        return "image/webp";
      case "pdf":
        return "application/pdf";
      default:
        return "image/jpeg";
    }
  }

  private cleanName(name: unknown): string | null {
    if (typeof name !== "string") return null;
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}

export const geminiOcrService = new GeminiOcrService();
