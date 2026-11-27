import { NextResponse } from "next/server";
import { z } from "zod";
import { gatewayRegistry, type GatewayContext } from "../../gateway-registry";
import { getAuthenticatedUser } from "../../auth/current-user";
import { jsonSuccess } from "../../api-response";
import { ValidationErrorAppError, NotFoundError } from "../../api-error";
import { importService } from "./import.service";
import { CreditCardService } from "../credit-cards/credit-card.service";
import type { ConfirmSlipRequest } from "@/types/import.types";

const confirmSlipSchema = z.object({
  amount: z.number().positive("จำนวนเงินต้องมากกว่า 0"),
  transactionDate: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.number().nullable().optional(),
  bankAccountId: z.number().nullable().optional(),
  creditCardId: z.number().nullable().optional(),
  payeeName: z.string().nullable().optional(),
  payerName: z.string().nullable().optional(),
  transactionReference: z.string().nullable().optional(),
  tagIds: z.array(z.number()).optional(),
});

async function parseMultipartFormData(ctx: GatewayContext): Promise<FormData> {
  if (
    ctx.payload.body &&
    (ctx.payload.body instanceof ArrayBuffer || Buffer.isBuffer(ctx.payload.body))
  ) {
    const tempRes = new Response(ctx.payload.body, {
      headers: {
        "Content-Type": ctx.payload.contentType || "multipart/form-data",
      },
    });
    return await tempRes.formData();
  }

  return await ctx.req.formData();
}

export function registerImportRoutes(): void {
  // 1. POST imports/slips (and alias POST imports/ocr)
  const handleUploadSlip = async (ctx: GatewayContext) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const formData = await parseMultipartFormData(ctx);

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw new ValidationErrorAppError("กรุณาเลือกไฟล์สลิปที่ต้องการอัปโหลด");
    }

    const bankCode = formData.get("bankCode")?.toString() || null;
    const batchImageCount =
      parseInt(formData.get("batchImageCount")?.toString() || "1", 10) || 1;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || "slip.jpg";
    const contentType = file.type || "image/jpeg";
    const fileSize = file.size || fileBuffer.length;

    // Check optional header or form field for mock testing (e.g. CI without Gemini API key)
    const mockDataHeader = ctx.req.headers.get("x-mock-extracted");
    let mockExtracted = undefined;
    if (mockDataHeader) {
      try {
        mockExtracted = JSON.parse(mockDataHeader);
      } catch {}
    }

    const result = await importService.uploadSlip(
      userId,
      fileBuffer,
      fileName,
      contentType,
      fileSize,
      bankCode,
      batchImageCount,
      mockExtracted,
    );

    return jsonSuccess(result);
  };

  gatewayRegistry.register("POST", "imports/slips", handleUploadSlip);
  gatewayRegistry.register("POST", "imports/ocr", handleUploadSlip);

  // Statement Upload: POST imports/credit-card-statements, imports/statements, credit-cards/:cardId/statements
  const handleUploadStatement = async (ctx: GatewayContext) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const formData = await parseMultipartFormData(ctx);

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw new ValidationErrorAppError(
        "กรุณาเลือกไฟล์ใบแจ้งยอดที่ต้องการนำเข้า",
      );
    }

    const cardIdParam = ctx.params?.cardId;
    const cardIdForm = formData.get("creditCardId")?.toString();
    const creditCardId = Number(cardIdParam || cardIdForm);
    if (!creditCardId || isNaN(creditCardId)) {
      throw new ValidationErrorAppError("กรุณาระบุบัตรเครดิตที่ต้องการนำเข้า");
    }

    const format = formData.get("format")?.toString() || null;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || "statement.csv";

    const result = await CreditCardService.importStatement(
      userId,
      creditCardId,
      fileBuffer,
      fileName,
      format,
    );

    return jsonSuccess(result, 201);
  };

  gatewayRegistry.register(
    "POST",
    "imports/credit-card-statements",
    handleUploadStatement,
  );
  gatewayRegistry.register(
    "POST",
    "imports/statements",
    handleUploadStatement,
  );
  gatewayRegistry.register(
    "POST",
    "credit-cards/:cardId/statements",
    handleUploadStatement,
  );

  // 2. GET imports/slips/:id
  gatewayRegistry.register("GET", "imports/slips/:id", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const slipId = Number(ctx.params.id);
    if (!slipId || isNaN(slipId)) {
      throw new ValidationErrorAppError("รหัสสลิปไม่ถูกต้อง");
    }

    const result = await importService.getSlipById(userId, slipId);
    if (!result) {
      throw new NotFoundError("ไม่พบสลิปที่ระบุ");
    }

    return jsonSuccess(result);
  });

  // 3. GET imports/slips/:id/image
  gatewayRegistry.register("GET", "imports/slips/:id/image", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const slipId = Number(ctx.params.id);
    if (!slipId || isNaN(slipId)) {
      throw new ValidationErrorAppError("รหัสสลิปไม่ถูกต้อง");
    }

    const file = await importService.getSlipFile(userId, slipId);
    if (!file) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  });

  // 4. POST imports/slips/:id/confirm
  gatewayRegistry.register("POST", "imports/slips/:id/confirm", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const slipId = Number(ctx.params.id);
    if (!slipId || isNaN(slipId)) {
      throw new ValidationErrorAppError("รหัสสลิปไม่ถูกต้อง");
    }

    let rawBody: unknown;
    try {
      rawBody =
        typeof ctx.payload.body === "string"
          ? JSON.parse(ctx.payload.body)
          : await ctx.req.json();
    } catch {
      throw new ValidationErrorAppError("รูปแบบ JSON ไม่ถูกต้อง");
    }

    const validated = confirmSlipSchema.parse(rawBody) as ConfirmSlipRequest;
    const result = await importService.confirmSlip(userId, slipId, validated);
    return jsonSuccess(result);
  });

  // 5. POST imports/slips/:id/reject
  gatewayRegistry.register("POST", "imports/slips/:id/reject", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const slipId = Number(ctx.params.id);
    if (!slipId || isNaN(slipId)) {
      throw new ValidationErrorAppError("รหัสสลิปไม่ถูกต้อง");
    }

    const success = await importService.rejectSlip(userId, slipId);
    if (!success) {
      throw new NotFoundError("ไม่พบสลิปที่ระบุ");
    }

    return jsonSuccess({ rejected: true });
  });

  // 6. GET imports/jobs
  gatewayRegistry.register("GET", "imports/jobs", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const page = parseInt(ctx.searchParams.get("page") || "1", 10) || 1;
    const pageSize = parseInt(ctx.searchParams.get("pageSize") || "20", 10) || 20;
    const type = ctx.searchParams.get("type");

    const result = await importService.getJobs(userId, page, pageSize, type);
    return jsonSuccess(result);
  });

  // 7. GET imports/jobs/:id
  gatewayRegistry.register("GET", "imports/jobs/:id", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const jobId = Number(ctx.params.id);
    if (!jobId || isNaN(jobId)) {
      throw new ValidationErrorAppError("รหัสงานนำเข้าไม่ถูกต้อง");
    }

    const result = await importService.getJobById(userId, jobId);
    if (!result) {
      throw new NotFoundError("ไม่พบงานนำเข้าที่ระบุ");
    }

    return jsonSuccess(result);
  });
}
