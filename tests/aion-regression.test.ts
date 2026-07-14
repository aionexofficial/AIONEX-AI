import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("AION migration is additive and documents non-destructive rollback", async () => {
  const migration = await readFile(new URL("../db/migrations/012_project_aion.sql", import.meta.url), "utf8");
  const integration = await readFile(new URL("../db/migrations/013_aion_ecosystem_integration.sql", import.meta.url), "utf8");
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|COLUMN)\b/i);
  assert.doesNotMatch(integration, /\bDROP\s+(TABLE|COLUMN)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
  assert.doesNotMatch(integration, /\bTRUNCATE\b/i);
  assert.match(migration, /ON CONFLICT\(user_id\) DO NOTHING/i);
  assert.match(integration, /aion_referral_events/);
  assert.match(integration, /tap_milestone/);
  const guidance = await readFile(new URL("../docs/project-aion-migration.md", import.meta.url), "utf8");
  assert.match(guidance, /Do not drop them in production/i);
});

test("Telegram publishing and admin notification destinations stay separated", async () => {
  const source = await readFile(new URL("../lib/automation/publish.ts", import.meta.url), "utf8");
  assert.match(source, /TELEGRAM_CHANNEL_ID/);
  assert.match(source, /TELEGRAM_ADMIN_CHAT_ID/);
  assert.match(source, /publishTelegram[\s\S]*verifyOfficialTelegramChannel/);
  assert.match(source, /notifyTelegramAdmin[\s\S]*telegramAdminChatId/);
  assert.doesNotMatch(source, /TELEGRAM_CHAT_ID/);
});

test("protected automation workflows and cron definitions retain duplicate protection", async () => {
  const pipeline = await readFile(new URL("../lib/automation/pipeline.ts", import.meta.url), "utf8");
  const engine = await readFile(new URL("../lib/automation/engine.ts", import.meta.url), "utf8");
  assert.match(pipeline, /Already published/);
  assert.match(pipeline, /ON CONFLICT/);
  assert.match(engine, /content_hash/);
  assert.match(engine, /ON CONFLICT/);
});
