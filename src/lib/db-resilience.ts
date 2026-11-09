import { setupDnsResilience } from "./dns-resilience";

// Ensure DNS resilience is available whenever DB resilience utilities are loaded
setupDnsResilience();

/**
 * Checks whether an error is a permanent, non-retryable database error
 * (e.g., syntax errors, authentication failures, missing tables/columns, constraint violations).
 */
export function isPermanentDbError(error: unknown): boolean {
  if (!error) return false;

  const err = error as {
    code?: string;
    message?: string;
    cause?: unknown;
  };

  const code = typeof err.code === "string" ? err.code : "";
  const message =
    typeof err.message === "string" ? err.message.toLowerCase() : "";

  // PostgreSQL permanent error classes:
  // Class 28: Invalid Authorization Specification (e.g. 28P01 invalid password)
  // Class 42: Syntax Error or Access Rule Violation (e.g. 42P01 undefined table, 42703 undefined column)
  // Class 23: Integrity Constraint Violation (e.g. 23505 unique violation)
  // Class 22: Data Exception
  // Class 0A: Feature Not Supported
  if (
    code.startsWith("28") ||
    code.startsWith("42") ||
    code.startsWith("23") ||
    code.startsWith("22") ||
    code.startsWith("0A") ||
    code === "INVALID_URL" ||
    message.includes("password authentication failed") ||
    message.includes("database does not exist") ||
    message.includes("role does not exist") ||
    message.includes("column does not exist") ||
    message.includes("relation does not exist")
  ) {
    return true;
  }

  if (err.cause && typeof err.cause === "object") {
    return isPermanentDbError(err.cause);
  }

  return false;
}

/**
 * Detects whether an error represents a database connectivity, DNS, network,
 * timeout, or service unavailability error.
 */
export function isDbConnectionError(error: unknown): boolean {
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

  // Better-auth APIError for DB failures during getSession / auth
  if (
    bodyCode === "FAILED_TO_GET_SESSION" ||
    bodyCode === "DATABASE_ERROR" ||
    lowerMessage.includes("failed to get session") ||
    lowerBodyMessage.includes("failed to get session") ||
    lowerMessage.includes("database error") ||
    lowerBodyMessage.includes("database error")
  ) {
    return true;
  }

  // Common network / DNS / socket / Postgres connection error codes:
  // ENOTFOUND / EAI_AGAIN / EREFUSED: DNS lookup failure
  // ECONNRESET: Connection dropped/reset by remote server or proxy
  // ECONNREFUSED: Server refused connection
  // ETIMEDOUT: Network timeout
  // EPIPE: Broken pipe
  // 57P01: admin_shutdown (PgBouncer/Postgres backend termination)
  // 57P02: crash_shutdown
  // 57P03: cannot_connect_now (Neon compute starting up or suspended)
  // 08000: connection_exception
  // 08003: connection_does_not_exist
  // 08006: connection_failure
  const connectionCodes = [
    "ENOTFOUND",
    "EAI_AGAIN",
    "EREFUSED",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EPIPE",
    "57P01",
    "57P02",
    "57P03",
    "08000",
    "08003",
    "08006",
  ];

  if (connectionCodes.includes(code) || connectionCodes.includes(bodyCode)) {
    return true;
  }

  // Inspect message text for connection-level errors
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
    lowerMessage.includes("could not connect to server") ||
    lowerMessage.includes("the database system is starting up") ||
    lowerMessage.includes("the database system is shutting down") ||
    lowerMessage.includes("endpoint unavailable") ||
    lowerMessage.includes(
      "terminating connection due to administrator command",
    ) ||
    lowerBodyMessage.includes("connection terminated") ||
    lowerBodyMessage.includes("read econnreset") ||
    lowerBodyMessage.includes("connection reset") ||
    lowerBodyMessage.includes("could not connect to server")
  ) {
    return true;
  }

  // Check nested cause recursively if available
  if (err.cause) {
    if (typeof err.cause === "object") {
      return isDbConnectionError(err.cause);
    }
    if (typeof err.cause === "string") {
      return isDbConnectionError({ message: err.cause });
    }
  }

  return false;
}

/**
 * Checks whether an error is transient and safe to retry.
 * Permanent configuration or query errors (bad password, missing relation) are never transient.
 */
export function isTransientDbError(error: unknown): boolean {
  if (isPermanentDbError(error)) {
    return false;
  }
  return isDbConnectionError(error);
}

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  operationName?: string;
}

/**
 * Executes an idempotent database operation with safe exponential backoff
 * when transient connection issues occur. Avoids infinite retries and skips
 * retrying permanent configuration or syntax errors.
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
      const errMsg = error instanceof Error ? error.message : String(error);
      const errCode = (error as { code?: string })?.code || "UNKNOWN";
      console.warn(
        `[${operationName}] Transient DB error [${errCode}] (attempt ${attempt}/${retries}). Retrying in ${backoff}ms... Details: ${errMsg}`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}
