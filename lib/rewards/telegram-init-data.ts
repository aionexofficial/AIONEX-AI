import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramWebAppUser = { id: number; username?: string; first_name?: string; last_name?: string; photo_url?: string; language_code?: string };

export function verifyTelegramInitDataWithToken(initData: string, token: string, nowMs = Date.now()) {
  if (!token || !initData || initData.length > 16_384) return null;
  const params = new URLSearchParams(initData);
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) return null;
  const hash = params.get("hash"), authDate = Number(params.get("auth_date"));
  const age = nowMs / 1000 - authDate;
  if (!hash || !authDate || age > 900 || age < -30) return null;
  params.delete("hash");
  const data = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const expected = createHmac("sha256", secret).update(data).digest("hex");
  const left = Buffer.from(hash), right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try { const user = JSON.parse(params.get("user") || "null") as TelegramWebAppUser | null; return user && Number.isSafeInteger(user.id) && user.id > 0 ? user : null; } catch { return null; }
}
