import "server-only";

type Context = Record<string, string | number | boolean | null | undefined>;

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/(Bearer\s+)[^\s]+/gi, "$1[redacted]")
    .replace(/(bot)\d+:[\w-]+/gi, "$1[redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgresql://[redacted]")
    .slice(0, 500);
}

export function logError(scope: string, error: unknown, context: Context = {}) {
  console.error(JSON.stringify({ level: "error", scope, message: safeMessage(error), ...context, timestamp: new Date().toISOString() }));
}
