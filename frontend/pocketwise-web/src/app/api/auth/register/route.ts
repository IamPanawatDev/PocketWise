import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/server/modules/auth/auth.service";
import { setAuthCookiesFromData } from "@/lib/server/auth-endpoints";
import { AppError } from "@/lib/server/api-error";
import { serverConfig } from "@/lib/server/config";

export async function POST(req: NextRequest) {
  try {
    if (serverConfig.configError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFIG_ERROR",
            message: `การตั้งค่า Server บน Vercel ไม่ครบถ้วน: ${serverConfig.configError} (กรุณาไปที่ Vercel Dashboard > Settings > Environment Variables เพื่อเพิ่ม DATABASE_URL และ JWT_SECRET)`,
          },
        },
        { status: 500 },
      );
    }
    const body = await req.json().catch(() => ({}));
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined;

    if (!body?.email || !body?.password || !body?.displayName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "กรุณากรอกข้อมูลให้ครบถ้วน",
          },
        },
        { status: 400 },
      );
    }

    const result = await authService.register(
      body.displayName,
      body.email,
      body.password,
      ip,
      userAgent,
    );

    const data = {
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
      user: result.user,
    };

    const res = NextResponse.json({
      success: true,
      data: {
        user: result.user,
        refreshToken: result.refreshToken,
      },
    });

    setAuthCookiesFromData(res, data);
    return res;
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode },
      );
    }
    console.error("[RegisterRoute] Internal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "เกิดข้อผิดพลาดในการลงทะเบียน",
        },
      },
      { status: 500 },
    );
  }
}
