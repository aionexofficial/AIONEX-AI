import { createHmac, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.AUTH_SECRET;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
if (!databaseUrl || !authSecret || !telegramToken) throw new Error("DATABASE_URL, AUTH_SECRET, and TELEGRAM_BOT_TOKEN are required.");

const sql = neon(databaseUrl);
const suffix = randomBytes(6).toString("hex");
const codeSuffix = suffix.toUpperCase();
const createdUsers = [];
let taskId;

function rewardCookie(userId) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 60_000 })).toString("base64url");
  const signature = createHmac("sha256", authSecret).update(payload).digest("base64url");
  return `aionex_rewards_session=${payload}.${signature}`;
}

async function request(path, options = {}) {
  const response = await fetch(`http://localhost:3000${path}`, options);
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

try {
  const migrations = await sql`SELECT filename FROM schema_migrations ORDER BY filename`;
  const requiredTables = ["automation_posts","reward_users","reward_identities","reward_tasks","reward_task_claims","reward_point_ledger","reward_badges","reward_user_badges","reward_link_codes","reward_anti_cheat_events","reward_settings","schema_migrations"];
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  const tableNames = new Set(tables.map((row) => row.table_name));
  if (!requiredTables.every((table) => tableNames.has(table))) throw new Error("Required database tables are missing.");

  const referrer = await sql`INSERT INTO reward_users(display_name,referral_code) VALUES(${'Verification Referrer'},${`VERIFY-R-${codeSuffix}`}) RETURNING id,referral_code`;
  const user = await sql`INSERT INTO reward_users(display_name,referral_code) VALUES(${'Verification User'},${`VERIFY-U-${codeSuffix}`}) RETURNING id`;
  const referrerId = String(referrer[0].id), userId = String(user[0].id);
  createdUsers.push(referrerId, userId);
  const task = await sql`INSERT INTO reward_tasks(category,title,description,reward_axp,verification_mode) VALUES('website_visit',${`Verification Task ${suffix}`},'Disposable integration test',25,'system') RETURNING id`;
  taskId = String(task[0].id);
  const headers = { Cookie: rewardCookie(userId), Origin: "http://localhost:3000", "Content-Type": "application/json" };

  const mine1 = await request("/api/rewards/mine", { method: "POST", headers, body: "{}" });
  const mine2 = await request("/api/rewards/mine", { method: "POST", headers, body: "{}" });
  const login1 = await request("/api/rewards/check-in", { method: "POST", headers, body: "{}" });
  const login2 = await request("/api/rewards/check-in", { method: "POST", headers, body: "{}" });
  const referral = await request("/api/rewards/referral", { method: "POST", headers, body: JSON.stringify({ code: referrer[0].referral_code }) });
  const claim1 = await request(`/api/rewards/tasks/${taskId}/claim`, { method: "POST", headers, body: "{}" });
  const claim2 = await request(`/api/rewards/tasks/${taskId}/claim`, { method: "POST", headers, body: "{}" });
  const me = await request("/api/rewards/me", { headers: { Cookie: rewardCookie(userId) } });
  const leaders = await request("/api/rewards/leaderboard");

  const telegramId = String(8_000_000_000 + Number.parseInt(suffix.slice(0, 6), 16));
  const userData = JSON.stringify({ id: Number(telegramId), username: `verify_${suffix}` });
  const init = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: `verify-${suffix}`, user: userData });
  const dataCheck = [...init.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const telegramSecret = createHmac("sha256", "WebAppData").update(telegramToken).digest();
  init.set("hash", createHmac("sha256", telegramSecret).update(dataCheck).digest("hex"));
  const telegramAuth = await request("/api/rewards/auth/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: init.toString() }) });
  const telegramIdentity = await sql`SELECT user_id FROM reward_identities WHERE provider='telegram' AND provider_user_id=${telegramId}`;
  if (telegramIdentity[0]) createdUsers.push(String(telegramIdentity[0].user_id));

  const checks = {
    migrations: migrations.length === 2,
    schema: true,
    mining: mine1.status === 200 && mine2.status === 409,
    dailyLogin: login1.status === 200 && login2.status === 409,
    referral: referral.status === 200,
    taskEngine: claim1.status === 201 && claim2.status === 409,
    profile: me.status === 200 && me.body.profile?.axpBalance > 0,
    leaderboard: leaders.status === 200 && leaders.body.leaders?.some((entry) => entry.id === userId),
    telegramDatabaseIdentity: telegramAuth.status === 200 && telegramIdentity.length === 1,
  };
  for (const [name, passed] of Object.entries(checks)) console.log(`${name}: ${passed ? "PASS" : "FAIL"}`);
  if (Object.values(checks).some((passed) => !passed)) {
    for (const [name, result] of Object.entries({ mine1, mine2, login1, login2, referral, claim1, claim2, me, leaders, telegramAuth })) {
      console.log(`${name}: HTTP ${result.status}${result.body?.error ? ` - ${String(result.body.error).slice(0, 160)}` : ""}`);
    }
    if (!checks.referral) {
      const referralState = await sql`SELECT id,axp_balance,referred_by FROM reward_users WHERE id IN (${userId}::uuid,${referrerId}::uuid) ORDER BY id`;
      const referralLedger = await sql`SELECT user_id,amount FROM reward_point_ledger WHERE idempotency_key IN (${'referrer:'+userId},${'referred:'+userId})`;
      console.log(`referralState: users=${referralState.length}, linked=${referralState.some((row) => String(row.id) === userId && String(row.referred_by) === referrerId)}, ledgerRows=${referralLedger.length}, awardedTotal=${referralLedger.reduce((sum,row)=>sum+Number(row.amount),0)}`);
    }
  }
  if (Object.values(checks).some((passed) => !passed)) process.exitCode = 1;
} finally {
  if (taskId) await sql`DELETE FROM reward_tasks WHERE id=${taskId}::uuid`;
  for (const userId of [...new Set(createdUsers)]) await sql`DELETE FROM reward_users WHERE id=${userId}::uuid`;
  console.log("Disposable verification records removed: OK");
}
