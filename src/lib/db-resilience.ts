/**
 * Resilience utilities for transient database connection errors
 * (e.g. Neon serverless PgBouncer idle disconnections, ECONNRESET, DNS hiccups).
 */

export function isTransientDbError(error: unknown): boolean {
  if (!error) return false;

  const err = error as {
    code?: string;
    message?: string;
    cause?: unknown;
  };

  const code = typeof err.code === "string" ? err.code : "";
  const message = typeof err.message === "string" ? err.message : "";

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
    code === "08006"
  ) {
    return true;
  }

  // Inspect message text for driver-level disconnection errors
  if (
    message.includes("Connection terminated unexpectedly") ||
    message.includes("read ECONNRESET") ||
    message.includes("connection reset") ||
    message.includes("client was closed") ||
    message.includes("terminating connection due to administrator command") ||
    message.includes("Connection terminated due to connection timeout") ||
    message.includes("FAILED_TO_GET_SESSION")
  ) {
    return true;
  }

  // Check nested cause recursively if available
  if (err.cause && typeof err.cause === "object") {
    return isTransientDbError(err.cause);
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
    retries = 2,
    delayMs = 150,
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
