import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "aionex_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type AdminSession = { email: string; exp: number; nonce: string };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) return null;
  return value;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyAdminCredentials(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!expectedEmail || !safeEqual(email.trim().toLowerCase(), expectedEmail)) return false;

  const encoded = process.env.ADMIN_PASSWORD_HASH;
  if (encoded) {
    const [salt, expectedHex] = encoded.split(":");
    if (!salt || !expectedHex || !/^[a-f\d]{128}$/i.test(expectedHex)) return false;
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  // Plaintext is accepted only for local setup; production requires scrypt.
  return process.env.NODE_ENV !== "production" && Boolean(process.env.ADMIN_PASSWORD) && safeEqual(password, process.env.ADMIN_PASSWORD!);
}

export function createAdminSession(email: string) {
  const signingSecret = secret();
  if (!signingSecret) throw new Error("Admin authentication is not configured.");
  const payload: AdminSession = { email, exp: Date.now() + SESSION_TTL_SECONDS * 1000, nonce: randomBytes(16).toString("hex") };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", signingSecret).update(encoded).digest("base64url");
  return { value: `${encoded}.${signature}`, maxAge: SESSION_TTL_SECONDS };
}

export function verifyAdminSession(value?: string): AdminSession | null {
  const signingSecret = secret();
  if (!value || !signingSecret) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", signingSecret).update(encoded).digest("base64url");
  if (!safeEqual(signature, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(encoded, "base64url").toString()) as AdminSession;
    if (!session.email || !session.nonce || session.exp <= Date.now()) return null;
    return session;
  } catch { return null; }
}

export async function getAdminSession() {
  const store = await cookies();
  return verifyAdminSession(store.get(ADMIN_COOKIE)?.value);
}
