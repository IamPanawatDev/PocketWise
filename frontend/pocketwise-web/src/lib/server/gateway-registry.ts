import { NextRequest, NextResponse } from "next/server";
import { handleServerError } from "./api-error";

export interface BodyPayload {
  body: BodyInit | null;
  contentType: string | null;
}

export interface GatewayContext {
  req: NextRequest;
  method: string;
  path: string[];
  params: Record<string, string>;
  searchParams: URLSearchParams;
  token: string | null;
  userId?: number;
  userRole?: string;
  payload: BodyPayload;
}

export type GatewayRouteHandler = (
  ctx: GatewayContext,
) => Promise<NextResponse | Response>;

interface RegisteredRoute {
  method: string;
  pattern: string; // e.g. "categories/:id" or "auth/login"
  segments: string[];
  handler: GatewayRouteHandler;
}

class GatewayRegistry {
  private routes: RegisteredRoute[] = [];

  /**
   * Register a local Next.js route handler
   * @param method HTTP Method: GET, POST, PUT, DELETE, PATCH
   * @param pattern Path pattern relative to /api/v1 (e.g. "auth/login", "categories/:id")
   * @param handler Async handler function
   */
  public register(
    method: string,
    pattern: string,
    handler: GatewayRouteHandler,
  ): void {
    const cleanPattern = pattern.replace(/^\/+|\/+$/g, "");
    const segments = cleanPattern.split("/").filter(Boolean);
    this.routes.push({
      method: method.toUpperCase(),
      pattern: cleanPattern,
      segments,
      handler,
    });
  }

  /**
   * Match incoming path segments against registered routes
   */
  public match(
    method: string,
    path: string[],
  ): { handler: GatewayRouteHandler; params: Record<string, string>; pattern: string } | null {
    const targetMethod = method.toUpperCase();

    for (const route of this.routes) {
      if (route.method !== targetMethod) continue;
      if (route.segments.length !== path.length) continue;

      const params: Record<string, string> = {};
      let isMatch = true;

      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        const val = path[i];

        if (seg.startsWith(":")) {
          // Dynamic parameter segment
          const paramName = seg.slice(1);
          params[paramName] = val;
        } else if (seg.toLowerCase() !== val.toLowerCase()) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        return {
          handler: route.handler,
          params,
          pattern: route.pattern,
        };
      }
    }

    return null;
  }

  /**
   * List all registered local routes
   */
  public getRegisteredRoutes(): { method: string; pattern: string }[] {
    return this.routes.map((r) => ({
      method: r.method,
      pattern: r.pattern,
    }));
  }

  /**
   * Clear all registered routes (useful for tests)
   */
  public clear(): void {
    this.routes = [];
  }
}

const globalForGateway = globalThis as unknown as {
  gatewayRegistry: GatewayRegistry | undefined;
};

export const gatewayRegistry =
  globalForGateway.gatewayRegistry ?? new GatewayRegistry();

globalForGateway.gatewayRegistry = gatewayRegistry;

