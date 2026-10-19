import { NextRequest } from "next/server";
import { getAccessToken, getRefreshToken, setAuthCookies } from "@/lib/server/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5268";

async function forward(
  path: string[],
  search: URLSearchParams,
  method: string,
  body: unknown,
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const qs = search.toString();
  const url = `${API_BASE_URL}/api/v1/${path.join("/")}${qs ? `?${qs}` : ""}`;

  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}

async function refreshAndRetry(
  path: string[],
  search: URLSearchParams,
  method: string,
  body: unknown,
): Promise<Response | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

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

  if (!json.success || !json.data) return null;

  await setAuthCookies({
    accessToken: json.data.accessToken,
    accessTokenExpiresAt: json.data.accessTokenExpiresAt,
    refreshToken: json.data.refreshToken,
    refreshTokenExpiresAt: json.data.refreshTokenExpiresAt,
  });

  const newToken = await getAccessToken();
  return forward(path, search, method, body, newToken);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const token = await getAccessToken();
  let res = await forward(path, req.nextUrl.searchParams, "GET", undefined, token);
  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "GET", undefined);
    if (retried) res = retried;
  }
  return passthrough(res);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const body = await readBody(req);
  const token = await getAccessToken();
  let res = await forward(path, req.nextUrl.searchParams, "POST", body, token);
  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "POST", body);
    if (retried) res = retried;
  }
  return passthrough(res);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const body = await readBody(req);
  const token = await getAccessToken();
  let res = await forward(path, req.nextUrl.searchParams, "PUT", body, token);
  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "PUT", body);
    if (retried) res = retried;
  }
  return passthrough(res);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const token = await getAccessToken();
  let res = await forward(path, req.nextUrl.searchParams, "DELETE", undefined, token);
  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "DELETE", undefined);
    if (retried) res = retried;
  }
  return passthrough(res);
}

async function readBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

function passthrough(res: Response): Response {
  return res;
}
