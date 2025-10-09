import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";

type RequestLike = NextRequest | (Request & { nextUrl?: URL | undefined });

type SuccessDetailContext = {
  request: RequestLike;
  response: Response;
  durationMs: number;
};

type ErrorDetailContext = {
  request: RequestLike;
  error: unknown;
  durationMs: number;
  statusCode: number;
};

type SuccessDetailResolver =
  | string
  | ((context: SuccessDetailContext) => string | Promise<string>);

type ErrorDetailResolver =
  | ((context: ErrorDetailContext) => string | Promise<string>);

export type LogEntry = {
  method: string;
  path: string;
  statusCode: number;
  details: string;
  timestamp?: Date;
};

export type ApiLoggingOptions = {
  successMessage?: SuccessDetailResolver;
  errorMessage?: ErrorDetailResolver;
};

const DEFAULT_LOG_DIR = path.join(process.cwd(), "logs");

function isLoggingEnabled(): boolean {
  const flag = process.env.ENABLE_LOGS;
  if (!flag) return false;
  return flag.toLowerCase() === "true";
}

function resolveLogDir(): string {
  const customDir = process.env.LOGS_DIR;
  if (customDir && customDir.trim().length > 0) {
    return path.resolve(customDir);
  }
  return DEFAULT_LOG_DIR;
}

async function ensureLogDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function formatDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = formatDatePart(date.getMonth() + 1);
  const day = formatDatePart(date.getDate());
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  const hours = formatDatePart(date.getHours());
  const minutes = formatDatePart(date.getMinutes());
  const seconds = formatDatePart(date.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
}

function sanitizeDetails(details: string): string {
  return details.replace(/[\r\n]+/g, " ").trim();
}

function getRequestMethod(request: RequestLike): string {
  const method = (request as Request).method ?? "";
  return method ? method.toUpperCase() : "UNKNOWN";
}

function getRequestPath(request: RequestLike): string {
  try {
    const maybeNext = (request as NextRequest).nextUrl;
    if (maybeNext) {
      return maybeNext.pathname;
    }
    const url = new URL((request as Request).url ?? "");
    return url.pathname;
  } catch {
    return "/unknown";
  }
}

function getSuccessDetail(
  option: SuccessDetailResolver | undefined,
  context: SuccessDetailContext,
): Promise<string> | string {
  if (!option) {
    const base = context.response.ok
      ? "Request completed successfully"
      : `Response sent with status ${context.response.status}`;
    return `${base} in ${context.durationMs}ms`;
  }

  if (typeof option === "string") {
    return option;
  }

  return option(context);
}

function getErrorDetail(
  option: ErrorDetailResolver | undefined,
  context: ErrorDetailContext,
): Promise<string> | string {
  if (!option) {
    const message =
      context.error instanceof Error
        ? context.error.message
        : typeof context.error === "string"
          ? context.error
          : "Unexpected error";
    return `Error after ${context.durationMs}ms: ${message}`;
  }

  return option(context);
}

export async function logApiAction(entry: LogEntry): Promise<void> {
  if (!isLoggingEnabled()) return;

  const timestamp = entry.timestamp ?? new Date();
  const dir = resolveLogDir();

  try {
    await ensureLogDirectory(dir);
    const filePath = path.join(dir, `${formatDate(timestamp)}.log`);
    const line =
      `[${formatDate(timestamp)} ${formatTime(timestamp)}] ` +
      `${entry.method.toUpperCase()} ${entry.path} ${entry.statusCode} ${sanitizeDetails(entry.details)}`;
    await fs.appendFile(filePath, `${line}\n`, "utf8");
  } catch (error) {
    console.error("[logger] Failed to write log entry", error);
  }
}

function extractStatusCode(error: unknown): number {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return 500;
}

export function withApiLogging<Context = unknown>(
  handler: (request: RequestLike, context: Context) => Response | Promise<Response>,
  options?: ApiLoggingOptions,
): (request: RequestLike, context: Context) => Promise<Response> {
  return async (request: RequestLike, context: Context): Promise<Response> => {
    const startedAt = Date.now();
    try {
      const response = await handler(request, context);
      const durationMs = Date.now() - startedAt;
      const details = await getSuccessDetail(options?.successMessage, {
        request,
        response,
        durationMs,
      });

      await logApiAction({
        method: getRequestMethod(request),
        path: getRequestPath(request),
        statusCode: response.status,
        details,
        timestamp: new Date(),
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const statusCode = extractStatusCode(error);
      const details = await getErrorDetail(options?.errorMessage, {
        request,
        error,
        durationMs,
        statusCode,
      });

      await logApiAction({
        method: getRequestMethod(request),
        path: getRequestPath(request),
        statusCode,
        details,
        timestamp: new Date(),
      });

      throw error;
    }
  };
}
