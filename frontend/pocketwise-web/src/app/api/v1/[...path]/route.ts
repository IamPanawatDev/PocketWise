import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { getAccessToken } from "@/lib/server/auth";
import {
  gatewayRegistry,
  type BodyPayload,
  type GatewayContext,
} from "@/lib/server/gateway-registry";
import { handleServerError } from "@/lib/server/api-error";
import { initializeGatewayRoutes } from "@/lib/server/modules";

// Initialize all registered local routes into Smart Gateway
initializeGatewayRoutes();

async function readBody(req: NextRequest): Promise<BodyPayload> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType) {
    return { body: null, contentType: null };
  }
  if (contentType.includes("multipart/form-data")) {
    const arrayBuffer = await req.arrayBuffer();
    return { body: arrayBuffer, contentType };
  }
  try {
    const json = await req.json();
    return { body: JSON.stringify(json), contentType: "application/json" };
  } catch {
    return { body: null, contentType: null };
  }
}

async function handleRequest(
  req: NextRequest,
  method: string,
  path: string[],
  payload: BodyPayload,
): Promise<NextResponse> {
  const token = await getAccessToken();

  // Match registered route in Gateway Registry (100% on Vercel Next.js)
  const localMatch = gatewayRegistry.match(method, path);
  if (localMatch) {
    try {
      const ctx: GatewayContext = {
        req,
        method,
        path,
        params: localMatch.params,
        searchParams: req.nextUrl.searchParams,
        token,
        payload,
      };
      const response = await localMatch.handler(ctx);
      return response instanceof NextResponse
        ? response
        : new NextResponse(response.body, response);
    } catch (err) {
      return handleServerError(err);
    }
  }

  // Final Cutover: Fallback to Render has been removed.
  console.warn(
    `[SmartGateway: 404 NOT_FOUND] ${method} /api/v1/${path.join("/")} is not registered`,
  );
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `ไม่พบ API endpoint: ${method} /api/v1/${path.join("/")}`,
      },
    },
    { status: 404 },
  );
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const emptyPayload: BodyPayload = { body: null, contentType: null };
  return handleRequest(req, "GET", path, emptyPayload);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const payload = await readBody(req);
  return handleRequest(req, "POST", path, payload);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const payload = await readBody(req);
  return handleRequest(req, "PUT", path, payload);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const emptyPayload: BodyPayload = { body: null, contentType: null };
  return handleRequest(req, "DELETE", path, emptyPayload);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const payload = await readBody(req);
  return handleRequest(req, "PATCH", path, payload);
}
