import "server-only";

import { createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";

function database() {
  const url = process.env.DATABASE_URL;
  const secret = process.env.AUTH_SECRET;

  if (!url || !secret) {
    throw new Error("Rate limiting is not configured.");
  }

  return { sql: neon(url), secret };
}

function hash(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function clientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function consumeAdminLoginAttempt(request: Request) {
  return consumeAuthAttempt(request, "admin_login", 5);
}

export async function consumeAuthAttempt(request: Request, scope: string, limit = 10) {
  const { sql, secret } = database();
  const key = hash(clientAddress(request), secret);
  const rows = await sql`
    INSERT INTO auth_rate_limits(scope, key_hash, attempt_count, reset_at)
    VALUES (${scope}, ${key}, 1, NOW() + INTERVAL '15 minutes')
    ON CONFLICT(scope, key_hash) DO UPDATE SET
      attempt_count = CASE
        WHEN auth_rate_limits.reset_at <= NOW() THEN 1
        ELSE auth_rate_limits.attempt_count + 1
      END,
      reset_at = CASE
        WHEN auth_rate_limits.reset_at <= NOW() THEN NOW() + INTERVAL '15 minutes'
        ELSE auth_rate_limits.reset_at
      END,
      updated_at = NOW()
    RETURNING attempt_count, reset_at
  `;

  return {
    allowed: Number(rows[0].attempt_count) <= limit,
    retryAfter: Math.max(
      1,
      Math.ceil(
        (new Date(String(rows[0].reset_at)).getTime() - Date.now()) / 1000,
      ),
    ),
  };
}

export async function clearAdminLoginAttempts(request: Request) {
  const { sql, secret } = database();
  const key = hash(clientAddress(request), secret);

  await sql`
    DELETE FROM auth_rate_limits
    WHERE scope = 'admin_login' AND key_hash = ${key}
  `;
}
