import "server-only";

import type { NextRequest } from "next/server";

import { logger } from "@/lib/logger";

const apiLogger = logger.child({ component: "api" });

// biome-ignore lint/suspicious/noExplicitAny: route handlers have varied context shapes
type RouteHandler<Ctx = any> = (
  request: NextRequest,
  context: Ctx,
) => Response | Promise<Response>;

function statusLevel(status: number): "info" | "warn" | "error" {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  return "info";
}

/**
 * Wraps a Next.js route handler so every invocation is logged with
 * method, path, query, response status and duration.
 *
 * @example
 * export const GET = withApiLogging(async (request) => { ... });
 */
export function withApiLogging<Ctx>(
  handler: RouteHandler<Ctx>,
): RouteHandler<Ctx> {
  return async (request, context) => {
    const start = performance.now();
    const { pathname, search } = request.nextUrl;
    const base = {
      method: request.method,
      path: pathname,
      ...(search ? { query: search } : {}),
    };

    apiLogger.info(base, `--> ${request.method} ${pathname}`);

    try {
      const response = await handler(request, context);
      const durationMs = Math.round(performance.now() - start);
      apiLogger[statusLevel(response.status)](
        { ...base, status: response.status, durationMs },
        `<-- ${request.method} ${pathname} ${response.status} ${durationMs}ms`,
      );
      return response;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      apiLogger.error(
        { ...base, durationMs, err },
        `<-- ${request.method} ${pathname} threw after ${durationMs}ms`,
      );
      throw err;
    }
  };
}
