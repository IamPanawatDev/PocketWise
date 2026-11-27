import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import type { ApiResponse, PagedResult, ValidationError } from "@/types/api.types";

/**
 * Creates standard successful JSON response matching ASP.NET Core ApiResponse<T>
 */
export function jsonSuccess<T>(
  data: T,
  status = 200,
  init?: ResponseInit,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status,
      ...init,
    },
  );
}

/**
 * Creates standard paginated response matching PagedResult<T>
 */
export function jsonPaged<T>(
  items: T[],
  page: number,
  pageSize: number,
  totalItems: number,
  status = 200,
  init?: ResponseInit,
): NextResponse<ApiResponse<PagedResult<T>>> {
  const totalPages = Math.ceil(totalItems / (pageSize > 0 ? pageSize : 1));
  return jsonSuccess<PagedResult<T>>(
    {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
    },
    status,
    init,
  );
}

/**
 * Creates standard error JSON response matching ASP.NET Core ApiResponse<never>
 */
export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: ValidationError[],
  traceId?: string,
  init?: ResponseInit,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        traceId: traceId || crypto.randomUUID(),
        details,
      },
    },
    {
      status,
      ...init,
    },
  );
}

/**
 * Validates request payload using Zod schema. Returns parsed data or throws ZodError.
 */
export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Error("Invalid JSON body");
  }

  return schema.parse(body);
}
