import "server-only";

import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { RewardProfile, RewardTask, TaskCategory } from "./types";

function sql() { const url = process.env.DATABASE_URL; if (!url) throw new Error("DATABASE_URL is not configured."); return neon(url); }
const referralCode = () => randomBytes(6).toString("base64url").toUpperCase();

export async function findOrCreateIdentity(provider: "wallet" | "telegram", providerUserId: string, metadata: Record<string, unknown>, currentUserId?: string | null) {
  const db = sql();
  const existing = await db`SELECT user_id FROM reward_identities WHERE provider=${provider} AND provider_user_id=${providerUserId} LIMIT 1`;
  if (existing[0]) return String(existing[0].user_id);
  let userId = currentUserId;
  if (!userId) {
    const users = await db`INSERT INTO reward_users (display_name, referral_code) VALUES (${String(metadata.username || metadata.address || "AIONEX Explorer").slice(0, 80)}, ${referralCode()}) RETURNING id`;
    userId = String(users[0].id);
  }
  const linked = await db`INSERT INTO reward_identities (user_id, provider, provider_user_id, metadata) VALUES (${userId}::uuid, ${provider}, ${providerUserId}, ${JSON.stringify(metadata)}::jsonb) ON CONFLICT (provider, provider_user_id) DO UPDATE SET metadata=EXCLUDED.metadata RETURNING user_id`;
  return String(linked[0].user_id);
}

export async function getProfile(userId: string): Promise<RewardProfile | null> {
  const db = sql();
  const rows = await db`SELECT u.*, (SELECT COUNT(*)::int + 1 FROM reward_users r WHERE r.status='active' AND r.lifetime_axp > u.lifetime_axp) AS rank FROM reward_users u WHERE u.id=${userId}::uuid LIMIT 1`;
  if (!rows[0]) return null;
  const badges = await db`SELECT b.slug,b.name,b.description,b.icon FROM reward_badges b JOIN reward_user_badges ub ON ub.badge_id=b.id WHERE ub.user_id=${userId}::uuid ORDER BY ub.awarded_at`;
  const row = rows[0];
  return { id: String(row.id), displayName: String(row.display_name), axpBalance: Number(row.axp_balance), lifetimeAxp: Number(row.lifetime_axp), loginStreak: Number(row.login_streak), lastCheckinDate: row.last_checkin_date ? String(row.last_checkin_date).slice(0, 10) : null, lastMinedAt: row.last_mined_at ? new Date(String(row.last_mined_at)).toISOString() : null, referralCode: String(row.referral_code), rank: Number(row.rank), badges: badges.map((badge) => ({ slug: String(badge.slug), name: String(badge.name), description: String(badge.description), icon: String(badge.icon) })) };
}

export async function listTasks(userId?: string | null): Promise<RewardTask[]> {
  const rows = userId
    ? await sql()`SELECT t.*, c.status AS claim_status FROM reward_tasks t LEFT JOIN LATERAL (SELECT status FROM reward_task_claims WHERE task_id=t.id AND user_id=${userId}::uuid ORDER BY created_at DESC LIMIT 1) c ON TRUE WHERE t.enabled=TRUE AND (t.starts_at IS NULL OR t.starts_at<=NOW()) AND (t.ends_at IS NULL OR t.ends_at>NOW()) ORDER BY t.sort_order,t.created_at`
    : await sql()`SELECT t.*, NULL::text AS claim_status FROM reward_tasks t WHERE t.enabled=TRUE AND (t.starts_at IS NULL OR t.starts_at<=NOW()) AND (t.ends_at IS NULL OR t.ends_at>NOW()) ORDER BY t.sort_order,t.created_at`;
  return rows.map((row) => ({ id: String(row.id), category: row.category as TaskCategory, title: String(row.title), description: String(row.description), rewardAxp: Number(row.reward_axp), enabled: Boolean(row.enabled), repeatMode: row.repeat_mode as RewardTask["repeatMode"], cooldownHours: row.cooldown_hours === null ? null : Number(row.cooldown_hours), verificationMode: row.verification_mode as RewardTask["verificationMode"], verificationConfig: (row.verification_config || {}) as Record<string, unknown>, completed: row.claim_status === "verified", claimStatus: row.claim_status ? String(row.claim_status) : null }));
}

export async function mine(userId: string, rewardAxp?: number) {
  rewardAxp ??= await rewardSetting("mining_axp", Number(process.env.REWARDS_MINING_AXP || 100));
  const key = `mine:${userId}:${Date.now()}`;
  const rows = await sql()`WITH eligible AS (
    SELECT id FROM reward_users WHERE id=${userId}::uuid AND status='active' AND (last_mined_at IS NULL OR last_mined_at<=NOW()-INTERVAL '24 hours') FOR UPDATE
  ), ledger AS (
    INSERT INTO reward_point_ledger(user_id,amount,reason,idempotency_key) SELECT id,${rewardAxp},'mining',${key} FROM eligible RETURNING user_id,amount
  )
  UPDATE reward_users u SET last_mined_at=NOW(),updated_at=NOW(),axp_balance=u.axp_balance+l.amount,lifetime_axp=u.lifetime_axp+l.amount
  FROM ledger l WHERE u.id=l.user_id RETURNING u.axp_balance,u.lifetime_axp,u.last_mined_at`;
  if (rows[0]) await evaluateBadges(userId);
  return rows[0] || null;
}

export async function dailyCheckin(userId: string, baseAxp?: number) {
  baseAxp ??= await rewardSetting("daily_login_axp", Number(process.env.REWARDS_LOGIN_AXP || 20));
  const rows = await sql()`WITH eligible AS (
    SELECT id,CASE WHEN last_checkin_date=CURRENT_DATE-1 THEN login_streak+1 ELSE 1 END AS next_streak
    FROM reward_users WHERE id=${userId}::uuid AND status='active' AND (last_checkin_date IS NULL OR last_checkin_date<CURRENT_DATE) FOR UPDATE
  ), ledger AS (
    INSERT INTO reward_point_ledger(user_id,amount,reason,idempotency_key,metadata)
    SELECT id,${baseAxp}+(LEAST(next_streak,7)-1)*5,'daily_login','login:'||id||':'||CURRENT_DATE,jsonb_build_object('streak',next_streak) FROM eligible
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING user_id,amount
  )
  UPDATE reward_users u SET login_streak=e.next_streak,last_checkin_date=CURRENT_DATE,updated_at=NOW(),axp_balance=u.axp_balance+l.amount,lifetime_axp=u.lifetime_axp+l.amount
  FROM ledger l JOIN eligible e ON e.id=l.user_id WHERE u.id=l.user_id RETURNING u.axp_balance,u.lifetime_axp,u.login_streak,u.last_checkin_date,l.amount`;
  if (rows[0]) await evaluateBadges(userId);
  return rows[0] || null;
}

export async function leaderboard(limit = 50) {
  return sql()`SELECT id,display_name,lifetime_axp,login_streak,DENSE_RANK() OVER (ORDER BY lifetime_axp DESC) AS rank FROM reward_users WHERE status='active' ORDER BY lifetime_axp DESC,created_at ASC LIMIT ${Math.min(limit, 100)}`;
}

export async function createLinkCode(userId: string) {
  const code = randomBytes(12).toString("base64url");
  await sql()`INSERT INTO reward_link_codes(code,user_id,expires_at) VALUES(${code},${userId}::uuid,NOW()+INTERVAL '15 minutes')`;
  return code;
}

export async function consumeLinkCode(code: string, telegramId: string, metadata: Record<string, unknown>) {
  const rows = await sql()`UPDATE reward_link_codes SET used_at=NOW() WHERE code=${code} AND used_at IS NULL AND expires_at>NOW() RETURNING user_id`;
  if (!rows[0]) return null;
  return findOrCreateIdentity("telegram", telegramId, metadata, String(rows[0].user_id));
}

export async function applyReferral(userId: string, code: string) {
  const referrerAxp = await rewardSetting("referrer_axp", Number(process.env.REWARDS_REFERRER_AXP || 100));
  const referredAxp = await rewardSetting("referred_axp", Number(process.env.REWARDS_REFERRED_AXP || 50));
  const rows = await sql()`WITH referral AS (
    SELECT u.id AS user_id,r.id AS referrer_id FROM reward_users u JOIN reward_users r ON r.referral_code=${code}
    WHERE u.id=${userId}::uuid AND u.status='active' AND u.referred_by IS NULL AND r.status='active' AND r.id<>u.id
    FOR UPDATE OF u,r
  ), ledger AS (
    INSERT INTO reward_point_ledger(user_id,amount,reason,reference_id,idempotency_key)
    SELECT awards.user_id,awards.amount,'referral',awards.reference_id,awards.idempotency_key
    FROM referral r CROSS JOIN LATERAL (VALUES
      (r.referrer_id,${referrerAxp}::bigint,r.user_id,'referrer:'||r.user_id),
      (r.user_id,${referredAxp}::bigint,r.referrer_id,'referred:'||r.user_id)
    ) AS awards(user_id,amount,reference_id,idempotency_key)
    ON CONFLICT(idempotency_key) DO NOTHING
    RETURNING user_id,amount
  ), totals AS (
    SELECT user_id,SUM(amount) AS amount FROM ledger GROUP BY user_id
  )
  UPDATE reward_users u SET referred_by=CASE WHEN u.id=r.user_id THEN r.referrer_id ELSE u.referred_by END,axp_balance=u.axp_balance+t.amount,lifetime_axp=u.lifetime_axp+GREATEST(t.amount,0),updated_at=NOW()
  FROM totals t CROSS JOIN referral r WHERE u.id=t.user_id RETURNING u.id`;
  return rows.length === 2;
}

export async function claimTask(userId: string, taskId: string, evidence: Record<string, unknown>) {
  const tasks = await sql()`SELECT * FROM reward_tasks WHERE id=${taskId}::uuid AND enabled=TRUE AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>NOW()) AND EXISTS(SELECT 1 FROM reward_users WHERE id=${userId}::uuid AND status='active') LIMIT 1`;
  if (!tasks[0]) throw new Error("Task is unavailable.");
  const task = tasks[0];
  const cooldownHours = Math.max(1, Number(task.cooldown_hours || 24));
  const claimKey = task.repeat_mode === "daily" ? new Date().toISOString().slice(0, 10) : task.repeat_mode === "cooldown" ? `period:${Math.floor(Date.now()/(cooldownHours*3_600_000))}` : "once";
  const autoVerified = task.category === "website_visit" || task.category === "wallet_connect";
  const status = autoVerified ? "verified" : "pending";
  const claims = await sql()`INSERT INTO reward_task_claims(user_id,task_id,claim_key,status,evidence,awarded_axp) VALUES(${userId}::uuid,${taskId}::uuid,${claimKey},${status},${JSON.stringify(evidence)}::jsonb,${autoVerified ? Number(task.reward_axp) : 0}) ON CONFLICT(user_id,task_id,claim_key) DO NOTHING RETURNING id,status,awarded_axp`;
  if (!claims[0]) { await recordRiskEvent(userId,"duplicate_task_claim",10,{taskId,claimKey}); return null; }
  if (autoVerified) { await awardPoints(userId, Number(task.reward_axp), "task", String(claims[0].id), `task:${claims[0].id}`); await evaluateBadges(userId); }
  return claims[0];
}

export async function awardPoints(userId: string, amount: number, reason: "task" | "referral" | "achievement" | "admin_adjustment", referenceId: string, idempotencyKey: string) {
  return sql()`WITH ledger AS (INSERT INTO reward_point_ledger(user_id,amount,reason,reference_id,idempotency_key) VALUES(${userId}::uuid,${amount},${reason},${referenceId}::uuid,${idempotencyKey}) ON CONFLICT(idempotency_key) DO NOTHING RETURNING user_id,amount) UPDATE reward_users u SET axp_balance=u.axp_balance+l.amount,lifetime_axp=u.lifetime_axp+GREATEST(l.amount,0),updated_at=NOW() FROM ledger l WHERE u.id=l.user_id RETURNING u.*`;
}

export async function recordRiskEvent(userId: string | null, eventType: string, severity: number, details: Record<string, unknown>) { await sql()`INSERT INTO reward_anti_cheat_events(user_id,event_type,severity,details) VALUES(${userId}::uuid,${eventType},${Math.max(1,Math.min(100,severity))},${JSON.stringify(details)}::jsonb)`; if(userId)await sql()`UPDATE reward_users SET risk_score=LEAST(100,risk_score+${severity}),status=CASE WHEN risk_score+${severity}>=60 THEN 'review' ELSE status END WHERE id=${userId}::uuid`; }

export async function evaluateBadges(userId: string) { await sql()`INSERT INTO reward_user_badges(user_id,badge_id) SELECT ${userId}::uuid,b.id FROM reward_badges b JOIN reward_users u ON u.id=${userId}::uuid WHERE b.enabled=TRUE AND ((b.slug='first-mine' AND EXISTS(SELECT 1 FROM reward_point_ledger l WHERE l.user_id=u.id AND l.reason='mining')) OR (b.slug='streak-7' AND u.login_streak>=7) OR (b.slug='axp-1000' AND u.lifetime_axp>=1000)) ON CONFLICT DO NOTHING`; }

async function rewardSetting(key: string, fallback: number) { const rows=await sql()`SELECT value FROM reward_settings WHERE key=${key}`; return rows[0]?Number(rows[0].value):fallback; }
export async function adminRewardSettings(){return sql()`SELECT key,value FROM reward_settings ORDER BY key`;}
export async function adminUpdateRewardSettings(settings:Record<string,number>,admin:string){for(const [key,value] of Object.entries(settings)){if(!["mining_axp","daily_login_axp","referrer_axp","referred_axp"].includes(key)||!Number.isInteger(value)||value<0||value>100000)throw new Error("Invalid reward setting.");await sql()`INSERT INTO reward_settings(key,value,updated_by,updated_at) VALUES(${key},${value},${admin},NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=NOW()`;}return adminRewardSettings();}

export async function adminListTasks() { return sql()`SELECT * FROM reward_tasks ORDER BY sort_order,created_at DESC`; }
export async function adminCreateTask(input: { category: TaskCategory; title: string; description: string; rewardAxp: number; enabled: boolean; repeatMode: string; cooldownHours?: number | null; verificationMode: string; verificationConfig?: Record<string, unknown> }) { const rows = await sql()`INSERT INTO reward_tasks(category,title,description,reward_axp,enabled,repeat_mode,cooldown_hours,verification_mode,verification_config) VALUES(${input.category},${input.title},${input.description},${input.rewardAxp},${input.enabled},${input.repeatMode},${input.cooldownHours || null},${input.verificationMode},${JSON.stringify(input.verificationConfig || {})}::jsonb) RETURNING *`; return rows[0]; }
export async function adminUpdateTask(id: string, input: { title: string; description: string; rewardAxp: number; enabled: boolean }) { const rows = await sql()`UPDATE reward_tasks SET title=${input.title},description=${input.description},reward_axp=${input.rewardAxp},enabled=${input.enabled},updated_at=NOW() WHERE id=${id}::uuid RETURNING *`; return rows[0] || null; }
export async function adminDeleteTask(id: string) { const rows = await sql()`DELETE FROM reward_tasks WHERE id=${id}::uuid RETURNING id`; return Boolean(rows[0]); }
export async function adminStats() { const rows = await sql()`SELECT (SELECT COUNT(*) FROM reward_users) AS users,(SELECT COALESCE(SUM(lifetime_axp),0) FROM reward_users) AS axp_earned,(SELECT COUNT(*) FROM reward_task_claims WHERE status='pending') AS pending_claims,(SELECT COUNT(*) FROM reward_users WHERE status='review') AS flagged_users`; return rows[0]; }
