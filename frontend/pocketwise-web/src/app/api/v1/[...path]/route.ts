import { NextRequest } from "next/server";
import { clearAuthCookies, getAccessToken, getRefreshToken, setAuthCookies } from "@/lib/server/auth";

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
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (payload.contentType) {
    headers["Content-Type"] = payload.contentType;
  }
  if (token) headers.Authorization = `Bearer ${token}`;

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
  return forward(path, search, method, payload, newToken);
}

async function readBody(req: NextRequest): Promise<BodyPayload> {
  const contentType = req.headers.get("content-type");
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
  const emptyPayload: BodyPayload = { body: null, contentType: null };
  let res = await forward(path, req.nextUrl.searchParams, "GET", emptyPayload, token);
  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "GET", emptyPayload);
    if (retried) res = retried;
  }
  return passthrough(res);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const payload = await readBody(req);
  const token = await getAccessToken();
  let res = await forward(path, req.nextUrl.searchParams, "POST", payload, token);
  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "POST", payload);
    if (retried) res = retried;
  }
  if (res.ok && path.join("/") === "users/me/data-reset") {
    await clearAuthCookies();
  }
  return passthrough(res);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const payload = await readBody(req);
  const token = await getAccessToken();
  let res = await forward(path, req.nextUrl.searchParams, "PUT", payload, token);
  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "PUT", payload);
    if (retried) res = retried;
  }
  return passthrough(res);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const token = await getAccessToken();
  const emptyPayload: BodyPayload = { body: null, contentType: null };
  let res = await forward(path, req.nextUrl.searchParams, "DELETE", emptyPayload, token);
  if (res.status === 401) {
    const retried = await refreshAndRetry(path, req.nextUrl.searchParams, "DELETE", emptyPayload);
    if (retried) res = retried;
  }
  return passthrough(res);
}

function passthrough(res: Response): Response {
  return res;
}
