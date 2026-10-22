import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { clearAuthCookies, getAccessToken, getRefreshToken, setAuthCookies } from "@/lib/server/auth";
import { clearAuthCookiesFrom } from "@/lib/server/auth-endpoints";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5268";

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

async function refreshAndRetry(
  path: string[],
  search: URLSearchParams,
  method: string,
  payload: BodyPayload,
  clientOrigin?: string | null,
): Promise<Response | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (refreshRes.status !== 200) return null;

    const json = (await refreshRes.json()) as {
      success?: boolean;
      data?: {
        accessToken: string;
        accessTokenExpiresAt: string;
        refreshToken: string;
        refreshTokenExpiresAt: string;
      };
    };

    const newTokens = json.data;
    if (!newTokens) return null;

    await setAuthCookies(newTokens);

    return forward(path, search, method, payload, newTokens.accessToken, clientOrigin);
  } catch {
    return null;
  }
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

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const token = await getAccessToken();
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const emptyPayload: BodyPayload = { body: null, contentType: null };
  let res = await forward(path, req.nextUrl.searchParams, "GET", emptyPayload, token, origin);
  let shouldClearAuth = false;

  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "GET", emptyPayload, origin);
    if (retried) {
      res = retried;
    } else {
      shouldClearAuth = true;
      await clearAuthCookies();
    }
  }
  return await passthrough(res, shouldClearAuth);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const payload = await readBody(req);
  const token = await getAccessToken();
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  let res = await forward(path, req.nextUrl.searchParams, "POST", payload, token, origin);
  let shouldClearAuth = false;

  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "POST", payload, origin);
    if (retried) {
      res = retried;
    } else {
      shouldClearAuth = true;
      await clearAuthCookies();
    }
  }
  if (res.ok && path.join("/") === "users/me/data-reset") {
    shouldClearAuth = true;
    await clearAuthCookies();
  }
  return await passthrough(res, shouldClearAuth);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const payload = await readBody(req);
  const token = await getAccessToken();
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  let res = await forward(path, req.nextUrl.searchParams, "PUT", payload, token, origin);
  let shouldClearAuth = false;

  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "PUT", payload, origin);
    if (retried) {
      res = retried;
    } else {
      shouldClearAuth = true;
      await clearAuthCookies();
    }
  }
  return await passthrough(res, shouldClearAuth);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const token = await getAccessToken();
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const emptyPayload: BodyPayload = { body: null, contentType: null };
  let res = await forward(path, req.nextUrl.searchParams, "DELETE", emptyPayload, token, origin);
  let shouldClearAuth = false;

  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "DELETE", emptyPayload, origin);
    if (retried) {
      res = retried;
    } else {
      shouldClearAuth = true;
      await clearAuthCookies();
    }
  }
  return await passthrough(res, shouldClearAuth);
}

async function passthrough(res: Response, shouldClearAuth = false): Promise<NextResponse> {
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

  if (shouldClearAuth) {
    clearAuthCookiesFrom(nextRes);
  }

  return nextRes;
}
