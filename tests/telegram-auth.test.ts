import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { verifyTelegramInitDataWithToken } from "../lib/rewards/telegram-init-data.ts";

function signedInitData(token: string, user: Record<string, unknown>, authDate: number) {
  const values = new URLSearchParams({ auth_date: String(authDate), query_id: "AAE-test", user: JSON.stringify(user) });
  const data = [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  values.set("hash", createHmac("sha256", secret).update(data).digest("hex"));
  return values.toString();
}

test("valid Telegram initData preserves every supported user field", () => {
  const token = "123456:test-token", now = 1_800_000_000_000;
  const input = { id: 42, username: "aion_user", first_name: "Aion", last_name: "Tester", language_code: "en", photo_url: "https://example.test/a.png" };
  assert.deepEqual(verifyTelegramInitDataWithToken(signedInitData(token, input, now / 1000), token, now), input);
});

test("forged, expired and duplicated Telegram initData are rejected", () => {
  const token = "123456:test-token", now = 1_800_000_000_000;
  const valid = signedInitData(token, { id: 42 }, now / 1000);
  assert.equal(verifyTelegramInitDataWithToken(valid.replace(/hash=[^&]+/, "hash=bad"), token, now), null);
  assert.equal(verifyTelegramInitDataWithToken(signedInitData(token, { id: 42 }, now / 1000 - 901), token, now), null);
  assert.equal(verifyTelegramInitDataWithToken(`${valid}&auth_date=${now / 1000}`, token, now), null);
});

test("Telegram provisioning is race-safe, profile-idempotent and balance-preserving", async () => {
  const [database, migration] = await Promise.all([readFile(new URL("../lib/rewards/db.ts", import.meta.url), "utf8"), readFile(new URL("../db/migrations/019_telegram_daily_task_refresh.sql", import.meta.url), "utf8")]);
  assert.match(database, /pg_advisory_xact_lock/);
  assert.match(database, /ON CONFLICT\(provider,provider_user_id\) DO UPDATE/);
  assert.match(database, /aion_character_profiles[\s\S]*ON CONFLICT\(user_id\) DO NOTHING/);
  assert.match(migration, /SELECT u\.id[\s\S]*FROM reward_users u[\s\S]*ON CONFLICT\(user_id\) DO NOTHING/);
  assert.doesNotMatch(migration, /UPDATE reward_users SET (?:axp_balance|lifetime_axp|xp|level)/i);
});
