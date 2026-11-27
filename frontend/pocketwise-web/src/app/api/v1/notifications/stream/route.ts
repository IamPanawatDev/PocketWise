import { NextRequest } from "next/server";
import { serverConfig } from "@/lib/server/config";
import { verifyAccessToken, type UserJwtClaims } from "@/lib/server/auth/jwt";
import { notificationStreamManager } from "@/lib/server/modules/notifications/notification-stream";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const queryToken = req.nextUrl.searchParams.get("token");
  if (queryToken) {
    return queryToken;
  }

  const cookieToken = req.cookies.get(serverConfig.cookies.accessCookieName)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const claims: UserJwtClaims | null = await verifyAccessToken(token);
  if (!claims?.sub) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "UNAUTHORIZED", message: "โทเค็นไม่ถูกต้องหรือหมดอายุ" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const userId = Number(claims.sub);
  if (isNaN(userId) || userId <= 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "UNAUTHORIZED", message: "ข้อมูลผู้ใช้ในโทเค็นไม่ถูกต้อง" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  let keepAliveTimer: NodeJS.Timeout | null = null;
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

  const cleanup = () => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (streamController) {
      notificationStreamManager.removeClient(userId, streamController);
      streamController = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      notificationStreamManager.addClient(userId, controller);

      // Send initial connected event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            userId,
            connectedAt: new Date().toISOString(),
          })}\n\n`,
        ),
      );

      // Keep-alive heartbeat every 20 seconds
      keepAliveTimer = setInterval(() => {
        const success = notificationStreamManager.sendHeartbeat(controller);
        if (!success) {
          cleanup();
        }
      }, 20_000);
    },
    cancel() {
      cleanup();
    },
  });

  req.signal.addEventListener("abort", cleanup);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
