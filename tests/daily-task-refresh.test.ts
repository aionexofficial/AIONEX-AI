import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dailyTaskExternalKey, notificationCanBeAcquired, utcTaskPeriod } from "../lib/rewards/daily-task-rules.ts";

test("daily task periods are exact UTC calendar days", () => {
  assert.deepEqual(utcTaskPeriod("2026-07-19T23:59:59.999Z"), { date: "2026-07-19", startsAt: "2026-07-19T00:00:00.000Z", endsAt: "2026-07-20T00:00:00.000Z" });
  assert.deepEqual(utcTaskPeriod("2026-12-31T12:00:00Z"), { date: "2026-12-31", startsAt: "2026-12-31T00:00:00.000Z", endsAt: "2027-01-01T00:00:00.000Z" });
  assert.equal(dailyTaskExternalKey("2026-07-19", "daily-login"), "daily:2026-07-19:daily-login");
});

test("notification acquisition rejects duplicates and recovers stale attempts", () => {
  const now = new Date("2026-07-19T00:30:00Z");
  assert.equal(notificationCanBeAcquired("pending", null, now), true);
  assert.equal(notificationCanBeAcquired("sent", null, now), false);
  assert.equal(notificationCanBeAcquired("sending", new Date("2026-07-19T00:20:00Z"), now), false);
  assert.equal(notificationCanBeAcquired("sending", new Date("2026-07-19T00:10:00Z"), now), true);
});

test("migration and production routes implement additive idempotent recovery", async () => {
  const [migration, service, auth, dashboard, vercel, installer] = await Promise.all([
    readFile(new URL("../db/migrations/019_telegram_daily_task_refresh.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/rewards/daily-tasks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/rewards/auth/telegram/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/rewards/rewards-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/install-daily-task-refresh.ps1", import.meta.url), "utf8"),
  ]);
  for (const table of ["daily_task_periods", "daily_task_templates", "daily_task_user_progress", "daily_task_refresh_runs"]) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(migration, /ON CONFLICT\(user_id\) DO NOTHING/);
  assert.doesNotMatch(migration, /DELETE FROM|TRUNCATE TABLE|DROP TABLE/i);
  assert.match(service, /ON CONFLICT\(external_key\) DO NOTHING/);
  assert.match(service, /notification_status='sending'/);
  assert.match(auth, /ensureDailyTasksForUser/);
  assert.match(auth, /getAionState/);
  assert.doesNotMatch(dashboard, /!initialProfile\s*&&\s*webApp\.initData/);
  assert.match(vercel, /"schedule": "0 0 \* \* \*"/);
  assert.match(installer, /RepetitionInterval \(New-TimeSpan -Hours 1\)/);
});
