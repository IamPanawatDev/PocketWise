import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ValidationError } from "@/types/api.types";
import { jsonError } from "./api-response";

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: ValidationError[];

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: ValidationError[],
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationErrorAppError extends AppError {
  constructor(message = "ข้อมูลไม่ถูกต้อง", details?: ValidationError[]) {
    super("VALIDATION_ERROR", message, 422, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "ไม่พบข้อมูลที่ต้องการ") {
    super("NOT_FOUND", message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "กรุณาเข้าสู่ระบบก่อนดำเนินการ") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "คุณไม่มีสิทธิ์ในการดำเนินการนี้") {
    super("FORBIDDEN", message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

export class AccountSuspendedError extends AppError {
  constructor(reason?: string) {
    super(
      "ACCOUNT_SUSPENDED",
      reason ? `บัญชีถูกระงับ: ${reason}` : "บัญชีนี้ถูกระงับการใช้งาน",
      403,
    );
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่") {
    super("COOLDOWN", message, 429);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์") {
    super("INTERNAL_ERROR", message, 500);
  }
}

/**
 * Global error handler converting any thrown error into standardized Next.js JSON Response
 */
export function handleServerError(
  error: unknown,
  traceId?: string,
): NextResponse {
  if (error instanceof AppError) {
    return jsonError(
      error.code,
      error.message,
      error.statusCode,
      error.details,
      traceId,
    );
  }

  if (error instanceof ZodError) {
    const details: ValidationError[] = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return jsonError(
      "VALIDATION_ERROR",
      "ข้อมูลไม่ถูกต้อง",
      422,
      details,
      traceId,
    );
  }

  console.error(`[Unhandled Server Error] ${traceId ? `[${traceId}] ` : ""}`, error);

  return jsonError(
    "INTERNAL_ERROR",
    "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
    500,
    undefined,
    traceId,
  );
}
