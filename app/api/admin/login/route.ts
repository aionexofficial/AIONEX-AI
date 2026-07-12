import { ADMIN_COOKIE, createAdminSession, verifyAdminCredentials } from "@/lib/admin/auth";
import { cookies } from "next/headers";

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function requestKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const key = requestKey(request);
  const now = Date.now();
  const current = attempts.get(key);
  const attempt = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  if (attempt.count >= MAX_ATTEMPTS) {
    return Response.json({ error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(Math.ceil((attempt.resetAt - now) / 1000)) } });
  }

  try {
    const body = await request.json() as { username?: string; password?: string };
    const username = body.username?.slice(0, 64) ?? "";
    const password = body.password?.slice(0, 256) ?? "";
    if (!verifyAdminCredentials(username, password)) {
      attempts.set(key, { ...attempt, count: attempt.count + 1 });
      return Response.json({ error: "Invalid username or password." }, { status: 401 });
    }
    attempts.delete(key);
    const session = createAdminSession(username.trim().toLowerCase());
    (await cookies()).set(ADMIN_COOKIE, session.value, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: session.maxAge });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Admin authentication is not configured." }, { status: 503 });
  }
}
