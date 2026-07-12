import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "aionex_rewards_session";
const TTL = 60 * 60 * 24 * 30;

function secret() { const value = process.env.AUTH_SECRET; if (!value || value.length < 32) throw new Error("AUTH_SECRET is not configured."); return value; }
function equal(a: string, b: string) { const left = Buffer.from(a), right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }

export async function getRewardUserId() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !equal(signature, createHmac("sha256", secret()).update(payload).digest("base64url"))) return null;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string; exp: number }; return data.userId && data.exp > Date.now() ? data.userId : null; } catch { return null; }
}

export async function setRewardSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + TTL * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  (await cookies()).set(COOKIE, `${payload}.${signature}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: TTL, priority: "high" });
}
