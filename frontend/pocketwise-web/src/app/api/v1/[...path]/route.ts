import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { clearAuthCookies, getAccessToken, getRefreshToken, setAuthCookies } from "@/lib/server/auth";
import {
  AuthTokens,
  clearAuthCookiesFrom,
  refreshAuthTokens,
  setAuthCookiesFromData,
} from "@/lib/server/auth-endpoints";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5268";

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    if (typeof payload.exp !== "number") return false;
    return Date.now() >= payload.exp * 1000 - 30_000;
  } catch {
    return false;
  }
}

interface BodyPayload {
  body: BodyInit | null;
  contentType: string | null;
}

async function forward(
  path: string[],
  search: URLSearchParams,
  method: string,
  payload: BodyPayload,
  token: string | null,
  clientOrigin?: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (payload.contentType) {
    headers["Content-Type"] = payload.contentType;
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  if (clientOrigin) {
    headers["Origin"] = clientOrigin;
  }

  const qs = search.toString();
  const url = `${API_BASE_URL}/api/v1/${path.join("/")}${qs ? `?${qs}` : ""}`;

  return fetch(url, {
    method,
    headers,
    body: payload.body ?? undefined,
    cache: "no-store",
  });
}

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

async function passthrough(
  res: Response,
  options?: { shouldClearAuth?: boolean; newTokens?: AuthTokens | null },
): Promise<NextResponse> {
  const body = await res.arrayBuffer();
  const headers = new Headers(res.headers);
  // Remove content-encoding and content-length because fetch() automatically decompresses the body
  headers.delete("content-encoding");
  headers.delete("content-length");

  const nextRes = new NextResponse(body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });

  if (options?.shouldClearAuth) {
    clearAuthCookiesFrom(nextRes);
  } else if (options?.newTokens) {
    setAuthCookiesFromData(nextRes, options.newTokens);
  }

  return nextRes;
}

async function handleRequest(
  req: NextRequest,
  method: string,
  path: string[],
  payload: BodyPayload,
): Promise<NextResponse> {
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  let token = await getAccessToken();
  let newTokens: AuthTokens | null = null;
  let shouldClearAuth = false;

  // Proactively refresh if access token expired/missing and refresh token exists
  if (!token || isJwtExpired(token)) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      newTokens = await refreshAuthTokens(refreshToken);
      if (newTokens?.accessToken) {
        token = newTokens.accessToken;
        await setAuthCookies(newTokens);
      } else {
        shouldClearAuth = true;
        await clearAuthCookies();
        const unauthorizedRes = new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Session expired" },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
        return passthrough(unauthorizedRes, { shouldClearAuth: true });
      }
    }
  }

  let res = await forward(path, req.nextUrl.searchParams, method, payload, token, origin);

  // If backend returned 401 (e.g. token expired during request transit), attempt refresh and retry
  if (res.status === 401) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      newTokens = await refreshAuthTokens(refreshToken);
      if (newTokens?.accessToken) {
        token = newTokens.accessToken;
        await setAuthCookies(newTokens);
        res = await forward(path, req.nextUrl.searchParams, method, payload, token, origin);
      } else {
        shouldClearAuth = true;
        await clearAuthCookies();
      }
    } else {
      shouldClearAuth = true;
      await clearAuthCookies();
    }
  }

  if (res.ok && method === "POST" && path.join("/") === "users/me/data-reset") {
    shouldClearAuth = true;
    await clearAuthCookies();
  }

  return passthrough(res, { shouldClearAuth, newTokens });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const emptyPayload: BodyPayload = { body: null, contentType: null };
  return handleRequest(req, "GET", path, emptyPayload);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const payload = await readBody(req);
  return handleRequest(req, "POST", path, payload);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const payload = await readBody(req);
  return handleRequest(req, "PUT", path, payload);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const emptyPayload: BodyPayload = { body: null, contentType: null };
  return handleRequest(req, "DELETE", path, emptyPayload);
}
