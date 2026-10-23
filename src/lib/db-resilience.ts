/**
 * Resilience utilities for transient database connection errors
 * (e.g. Neon serverless PgBouncer idle disconnections, ECONNRESET, DNS hiccups).
 */

export function isTransientDbError(error: unknown): boolean {
  if (!error) return false;

  const err = error as {
    code?: string;
    message?: string;
    status?: string | number;
    statusCode?: number;
    cause?: unknown;
    body?: {
      code?: string;
      message?: string;
    };
  };

  const code = typeof err.code === "string" ? err.code : "";
  const bodyCode = typeof err.body?.code === "string" ? err.body.code : "";
  const message = typeof err.message === "string" ? err.message : "";
  const bodyMessage =
    typeof err.body?.message === "string" ? err.body.message : "";

  const lowerMessage = message.toLowerCase();
  const lowerBodyMessage = bodyMessage.toLowerCase();

  // Better-auth APIError for DB failures during getSession
  if (
    bodyCode === "FAILED_TO_GET_SESSION" ||
    bodyCode === "DATABASE_ERROR" ||
    lowerMessage.includes("failed to get session") ||
    lowerBodyMessage.includes("failed to get session")
  ) {
    return true;
  }

  // Common transient network / socket / postgres error codes:
  // ECONNRESET: Socket closed abruptly by remote server or proxy
  // ENOTFOUND / EAI_AGAIN: DNS lookup temporary failure
  // ETIMEDOUT / ECONNREFUSED: Network timeout or connection refused
  // 57P01: admin_shutdown (PgBouncer/Postgres backend termination)
  // 57P02: crash_shutdown
  // 57P03: cannot_connect_now
  // 08000 / 08003 / 08006: Connection exception
  if (
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "57P01" ||
    code === "57P02" ||
    code === "57P03" ||
    code === "08000" ||
    code === "08003" ||
    code === "08006" ||
    bodyCode === "ECONNRESET" ||
    bodyCode === "ENOTFOUND" ||
    bodyCode === "ETIMEDOUT"
  ) {
    return true;
  }

  // Inspect message text for driver-level disconnection errors
  if (
    lowerMessage.includes("connection terminated") ||
    lowerMessage.includes("read econnreset") ||
    lowerMessage.includes("connection reset") ||
    lowerMessage.includes("client was closed") ||
    lowerMessage.includes("terminating connection") ||
    lowerMessage.includes("connection timeout") ||
    lowerMessage.includes("connect econnrefused") ||
    lowerMessage.includes("socket hang up") ||
    lowerMessage.includes("neon.tech") ||
    lowerMessage.includes("getaddrinfo") ||
    lowerMessage.includes("fetch failed") ||
    lowerMessage.includes("pool has been destroyed") ||
    lowerMessage.includes("server closed the connection") ||
    lowerMessage.includes(
      "terminating connection due to administrator command",
    ) ||
    lowerBodyMessage.includes("connection terminated") ||
    lowerBodyMessage.includes("read econnreset") ||
    lowerBodyMessage.includes("connection reset")
  ) {
    return true;
  }

  // Check nested cause recursively if available
  if (err.cause) {
    if (typeof err.cause === "object") {
      return isTransientDbError(err.cause);
    }
    if (typeof err.cause === "string") {
      return isTransientDbError({ message: err.cause });
    }
  }

  return false;
}

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  operationName?: string;
}

/**
 * Executes an idempotent database operation with safe exponential backoff
 * when transient connection issues occur. Avoids infinite retries.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    delayMs = 200,
    operationName = "DB Operation",
  } = options;

  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      if (attempt > retries || !isTransientDbError(error)) {
        throw error;
      }

      const backoff = delayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[${operationName}] Transient DB connection error (attempt ${attempt}/${retries}). Retrying in ${backoff}ms... Details:`,
        error instanceof Error ? error.message : String(error),
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}
