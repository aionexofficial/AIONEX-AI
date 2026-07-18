import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AutomationFailure, creatomateHttpFailure, creatomateNetworkFailure, exponentialBackoffMs, isCreatomateBillingFailure } from "../lib/automation/failures.ts";

test("Creatomate 402 is classified as non-retryable manual work", () => {
  const failure = new AutomationFailure("HTTP 402", "creatomate_billing", false, true);
  assert.equal(isCreatomateBillingFailure(failure), true);
  assert.equal(failure.retryable, false);
  assert.equal(failure.manualRetry, true);
});

test("retry delays use bounded exponential backoff", () => {
  assert.deepEqual([0, 1, 2, 3].map((attempt) => exponentialBackoffMs(attempt, 1_000, 5_000)), [1_000, 2_000, 4_000, 5_000]);
});

test("only Creatomate 5xx and network failures are retryable", () => {
  assert.equal(creatomateHttpFailure(500).retryable, true);
  assert.equal(creatomateHttpFailure(503).retryable, true);
  assert.equal(creatomateNetworkFailure(new TypeError("fetch failed")).retryable, true);
  assert.equal(creatomateHttpFailure(400).retryable, false);
  assert.equal(creatomateHttpFailure(402).retryable, false);
  assert.equal(creatomateHttpFailure(429).retryable, false);
});

test("legacy Creatomate triggers are permanently disabled without failure alerts", async () => {
  const [client, engine, pipeline, storyRender, cron, previewCron, adminStory, adminAutomation, migration, vercel, packageJson] = await Promise.all([
    readFile(new URL("../lib/automation/creatomate.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/automation/engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/automation/pipeline.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/story/render.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cron/automation/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cron/story-preview/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/story/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/automation/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/migrations/016_disable_legacy_creatomate.sql", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(client, /creatomate_disabled/);
  assert.doesNotMatch(client, /fetch\(|notifyTelegramAdmin|should_alert/);
  assert.match(engine, /LEGACY_CREATOMATE_JOB_TYPES/);
  assert.match(pipeline, /Legacy Creatomate hourly pipeline is disabled/);
  assert.doesNotMatch(pipeline, /notifyTelegramAdmin|notifyError/);
  assert.match(storyRender, /Legacy Creatomate story rendering is disabled/);
  assert.doesNotMatch(storyRender, /notifyTelegramAdmin/);
  assert.match(cron, /status:410/);
  assert.match(previewCron, /status:410/);
  assert.match(adminStory, /Legacy Creatomate rendering and delivery are disabled/);
  assert.doesNotMatch(adminStory, /renderPrivateStoryPreview|publishStoryScenario/);
  assert.doesNotMatch(adminAutomation, /\["market\.analyze","content\.generate","post\.daily","youtube\.script","hourly\.pipeline"/);
  assert.match(migration, /status='cancelled'/);
  assert.match(migration, /"emergencyPause":true/);
  assert.doesNotMatch(vercel, /api\/cron\/automation/);
  assert.doesNotMatch(packageJson, /story:frames|story:preview/);
});
