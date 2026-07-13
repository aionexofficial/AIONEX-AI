import "server-only";

import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { LeaderboardMetric, RewardProfile, RewardTask, TaskCategory, TaskDifficulty, TaskGroup, VerificationMode } from "./types";

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
  const [badges, taskStats, miningDays] = await Promise.all([
    db`SELECT b.slug,b.name,b.description,b.icon FROM reward_badges b JOIN reward_user_badges ub ON ub.badge_id=b.id WHERE ub.user_id=${userId}::uuid ORDER BY ub.awarded_at`,
    db`SELECT COUNT(*) FILTER(WHERE status='verified')::int AS completed,COUNT(*) FILTER(WHERE status IN ('pending','review'))::int AS pending FROM reward_task_claims WHERE user_id=${userId}::uuid`,
    db`SELECT COUNT(DISTINCT created_at::date)::int AS streak FROM reward_point_ledger WHERE user_id=${userId}::uuid AND reason='mining' AND created_at>=CURRENT_DATE-INTERVAL '30 days'`
  ]);
  const row = rows[0];
  const referrals = await db`SELECT COUNT(*)::int AS count FROM reward_users WHERE referred_by=${userId}::uuid`;
  return { id: String(row.id), displayName: String(row.display_name), axpBalance: Number(row.axp_balance), lifetimeAxp: Number(row.lifetime_axp), xp: Number(row.xp || 0), level: Number(row.level || 1), loginStreak: Number(row.login_streak), miningStreak:Number(miningDays[0]?.streak||0),completedTasks:Number(taskStats[0]?.completed||0),pendingTasks:Number(taskStats[0]?.pending||0),lastCheckinDate: row.last_checkin_date ? String(row.last_checkin_date).slice(0, 10) : null, lastMinedAt: row.last_mined_at ? new Date(String(row.last_mined_at)).toISOString() : null, referralCode: String(row.referral_code), referralCount: Number(referrals[0]?.count || 0), rank: Number(row.rank), badges: badges.map((badge) => ({ slug: String(badge.slug), name: String(badge.name), description: String(badge.description), icon: String(badge.icon) })) };
}

export async function listTasks(userId?: string | null): Promise<RewardTask[]> {
  const rows = userId
    ? await sql()`SELECT t.*,c.status AS claim_status,c.verified_at AS completed_at,(SELECT COUNT(*)::int FROM reward_task_claims x WHERE x.task_id=t.id AND x.status='verified') AS completion_count FROM reward_tasks t LEFT JOIN LATERAL (SELECT status,verified_at FROM reward_task_claims WHERE task_id=t.id AND user_id=${userId}::uuid ORDER BY created_at DESC LIMIT 1)c ON TRUE WHERE t.enabled=TRUE AND (t.starts_at IS NULL OR t.starts_at<=NOW()) AND (t.ends_at IS NULL OR t.ends_at>NOW()) ORDER BY t.task_group,t.sort_order,t.created_at`
    : await sql()`SELECT t.*,NULL::text AS claim_status,NULL::timestamptz AS completed_at,(SELECT COUNT(*)::int FROM reward_task_claims x WHERE x.task_id=t.id AND x.status='verified') AS completion_count FROM reward_tasks t WHERE t.enabled=TRUE AND (t.starts_at IS NULL OR t.starts_at<=NOW()) AND (t.ends_at IS NULL OR t.ends_at>NOW()) ORDER BY t.task_group,t.sort_order,t.created_at`;
  return rows.map((row) => ({id:String(row.id),category:row.category as TaskCategory,group:row.task_group as TaskGroup,title:String(row.title),description:String(row.description),icon:String(row.icon),rewardAxp:Number(row.reward_axp),rewardXp:Number(row.reward_xp),difficulty:row.difficulty as TaskDifficulty,enabled:Boolean(row.enabled),status:row.claim_status==="verified"?"completed":row.claim_status?"pending":"available",repeatMode:row.repeat_mode as RewardTask["repeatMode"],cooldownHours:row.cooldown_hours===null?null:Number(row.cooldown_hours),verificationMode:row.verification_mode as VerificationMode,verificationConfig:(row.verification_config||{}) as Record<string,unknown>,taskUrl:row.task_url?String(row.task_url):null,createdAt:new Date(String(row.created_at)).toISOString(),completedAt:row.completed_at?new Date(String(row.completed_at)).toISOString():null,completed:row.claim_status==="verified",claimStatus:row.claim_status?String(row.claim_status):null,completionCount:Number(row.completion_count||0)}));
}

export async function mine(userId: string, rewardAxp?: number) {
  rewardAxp ??= await rewardSetting("mining_axp", Number(process.env.REWARDS_MINING_AXP || 100));
  const cooldown = await rewardSetting("mining_cooldown_hours", 24);
  const xp = await rewardSetting("mining_xp", 25);
  const key = `mine:${userId}:${Math.floor(Date.now()/(cooldown*3_600_000))}`;
  const rows = await sql()`WITH eligible AS (
    SELECT id FROM reward_users WHERE id=${userId}::uuid AND status='active' AND (last_mined_at IS NULL OR last_mined_at<=NOW()-make_interval(hours => ${cooldown})) FOR UPDATE
  ), ledger AS (
    INSERT INTO reward_point_ledger(user_id,amount,xp_awarded,reason,idempotency_key) SELECT id,${rewardAxp},${xp},'mining',${key} FROM eligible ON CONFLICT(idempotency_key) DO NOTHING RETURNING user_id,amount,xp_awarded
  )
  UPDATE reward_users u SET last_mined_at=NOW(),updated_at=NOW(),axp_balance=u.axp_balance+l.amount,lifetime_axp=u.lifetime_axp+l.amount,xp=u.xp+l.xp_awarded,level=1+FLOOR((u.xp+l.xp_awarded)/500.0)::int
  FROM ledger l WHERE u.id=l.user_id RETURNING u.axp_balance,u.lifetime_axp,u.xp,u.level,u.last_mined_at`;
  if (rows[0]) await evaluateBadges(userId);
  return rows[0] || null;
}

export async function dailyCheckin(userId: string, baseAxp?: number) {
  baseAxp ??= await rewardSetting("daily_login_axp", Number(process.env.REWARDS_LOGIN_AXP || 20));
  const xp = await rewardSetting("daily_login_xp", 10);
  const rows = await sql()`WITH eligible AS (
    SELECT id,CASE WHEN last_checkin_date=CURRENT_DATE-1 THEN login_streak+1 ELSE 1 END AS next_streak
    FROM reward_users WHERE id=${userId}::uuid AND status='active' AND (last_checkin_date IS NULL OR last_checkin_date<CURRENT_DATE) FOR UPDATE
  ), ledger AS (
    INSERT INTO reward_point_ledger(user_id,amount,xp_awarded,reason,idempotency_key,metadata)
    SELECT id,${baseAxp}+(LEAST(next_streak,7)-1)*5,${xp},'daily_login','login:'||id||':'||CURRENT_DATE,jsonb_build_object('streak',next_streak) FROM eligible
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING user_id,amount,xp_awarded
  )
  UPDATE reward_users u SET login_streak=e.next_streak,last_checkin_date=CURRENT_DATE,updated_at=NOW(),axp_balance=u.axp_balance+l.amount,lifetime_axp=u.lifetime_axp+l.amount,xp=u.xp+l.xp_awarded,level=1+FLOOR((u.xp+l.xp_awarded)/500.0)::int
  FROM ledger l JOIN eligible e ON e.id=l.user_id WHERE u.id=l.user_id RETURNING u.axp_balance,u.lifetime_axp,u.login_streak,u.last_checkin_date,l.amount`;
  if (rows[0]) await evaluateBadges(userId);
  return rows[0] || null;
}

export async function leaderboard(limit = 50) {
  return sql()`SELECT id,display_name,lifetime_axp,login_streak,DENSE_RANK() OVER (ORDER BY lifetime_axp DESC) AS rank FROM reward_users WHERE status='active' ORDER BY lifetime_axp DESC,created_at ASC LIMIT ${Math.min(limit, 100)}`;
}
export async function metricLeaderboard(metric:LeaderboardMetric,limit=50){const order={axp:"lifetime_axp",xp:"xp",referrals:"referrals",mining:"mining_claims",tasks:"completed_tasks"}[metric];return sql().query(`SELECT *,DENSE_RANK() OVER(ORDER BY ${order} DESC) AS rank FROM (SELECT u.id,u.display_name,u.lifetime_axp,u.xp,COUNT(DISTINCT r.id)::int AS referrals,COUNT(DISTINCT l.id) FILTER(WHERE l.reason='mining')::int AS mining_claims,COUNT(DISTINCT c.id) FILTER(WHERE c.status='verified')::int AS completed_tasks FROM reward_users u LEFT JOIN reward_users r ON r.referred_by=u.id LEFT JOIN reward_point_ledger l ON l.user_id=u.id LEFT JOIN reward_task_claims c ON c.user_id=u.id WHERE u.status='active' GROUP BY u.id)s ORDER BY ${order} DESC LIMIT $1`,[Math.min(limit,100)]);}

export async function referralLeaderboard(limit = 20) { return sql()`SELECT u.id,u.display_name,u.referral_code,COUNT(r.id)::int AS referrals,DENSE_RANK() OVER (ORDER BY COUNT(r.id) DESC) AS rank FROM reward_users u LEFT JOIN reward_users r ON r.referred_by=u.id WHERE u.status='active' GROUP BY u.id HAVING COUNT(r.id)>0 ORDER BY referrals DESC,u.created_at LIMIT ${Math.min(limit,100)}`; }
export async function rewardHistory(userId: string, limit = 50) { return sql()`SELECT id,amount,xp_awarded,reason,metadata,created_at FROM reward_point_ledger WHERE user_id=${userId}::uuid ORDER BY created_at DESC LIMIT ${Math.min(limit,100)}`; }
export async function miningStats(userId: string): Promise<{claims:number;earned:number;last_claim:string|null;cooldown_hours:number}> { const rows=await sql()`SELECT COUNT(*)::int AS claims,COALESCE(SUM(amount),0) AS earned,MAX(created_at) AS last_claim FROM reward_point_ledger WHERE user_id=${userId}::uuid AND reason='mining'`; const cooldown=await rewardSetting("mining_cooldown_hours",24); return {claims:Number(rows[0]?.claims||0),earned:Number(rows[0]?.earned||0),last_claim:rows[0]?.last_claim?String(rows[0].last_claim):null,cooldown_hours:cooldown}; }

export async function miningStatus(userId: string) {
  const [stats, sessions] = await Promise.all([
    miningStats(userId),
    sql()`SELECT id,status,started_at,ends_at,stopped_at,duration_seconds,awarded_axp,awarded_xp
      FROM reward_mining_sessions WHERE user_id=${userId}::uuid ORDER BY started_at DESC LIMIT 20`,
  ]);
  const session = sessions.find((row) => row.status === "active") || null;
  return {
    stats: { claims: stats.claims, earned: stats.earned, lastClaim: stats.last_claim ? new Date(stats.last_claim).toISOString() : null, cooldownHours: stats.cooldown_hours },
    session: session ? miningSessionDto(session) : null,
    history: sessions.filter((row) => row.status !== "active").map(miningSessionDto),
    serverTime: new Date().toISOString(),
  };
}

function miningSessionDto(row: Record<string, unknown>) {
  return {
    id: String(row.id), status: String(row.status), startedAt: new Date(String(row.started_at)).toISOString(),
    endsAt: new Date(String(row.ends_at)).toISOString(), stoppedAt: row.stopped_at ? new Date(String(row.stopped_at)).toISOString() : null,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds), awardedAxp: Number(row.awarded_axp || 0), awardedXp: Number(row.awarded_xp || 0),
  };
}

export async function startMiningSession(userId: string) {
  const minutes = Math.max(1, Math.min(1440, await rewardSetting("mining_session_minutes", 60)));
  const existing = await sql()`SELECT * FROM reward_mining_sessions WHERE user_id=${userId}::uuid AND status='active' LIMIT 1`;
  if (existing[0]) return { ok: false as const, error: "Mining is already active.", session: miningSessionDto(existing[0]) };
  const rows = await sql()`INSERT INTO reward_mining_sessions(user_id,ends_at)
    SELECT id,NOW()+make_interval(mins => ${minutes}) FROM reward_users
    WHERE id=${userId}::uuid AND status='active'
    AND (last_mined_at IS NULL OR last_mined_at<=NOW()-make_interval(hours => ${await rewardSetting("mining_cooldown_hours",24)}))
    ON CONFLICT DO NOTHING RETURNING *`;
  return rows[0] ? { ok: true as const, session: miningSessionDto(rows[0]) } : { ok: false as const, error: "Mining cooldown is still active.", session: null };
}

export async function stopMiningSession(userId: string) {
  const active = await sql()`SELECT * FROM reward_mining_sessions WHERE user_id=${userId}::uuid AND status='active' FOR UPDATE`;
  if (!active[0]) return { ok: false as const, error: "No active mining session." };
  const row = active[0], total = Math.max(1, (new Date(String(row.ends_at)).getTime()-new Date(String(row.started_at)).getTime())/1000);
  const elapsed = Math.max(0, Math.min(total, (Date.now()-new Date(String(row.started_at)).getTime())/1000));
  if (elapsed < 60) return { ok: false as const, error: "Mine for at least one minute before stopping." };
  const base = await rewardSetting("mining_axp", Number(process.env.REWARDS_MINING_AXP || 100));
  const baseXp = await rewardSetting("mining_xp", 25), axp = Math.max(1, Math.floor(base*elapsed/total)), xp = Math.max(1, Math.floor(baseXp*elapsed/total));
  const key = `mining-session:${row.id}`;
  const completed = await sql()`WITH closed AS (
      UPDATE reward_mining_sessions SET status='completed',stopped_at=NOW(),duration_seconds=${Math.floor(elapsed)},awarded_axp=${axp},awarded_xp=${xp},updated_at=NOW()
      WHERE id=${row.id}::uuid AND status='active' RETURNING *
    ), ledger AS (
      INSERT INTO reward_point_ledger(user_id,amount,xp_awarded,reason,reference_id,idempotency_key,metadata)
      SELECT user_id,${axp},${xp},'mining',id,${key},jsonb_build_object('durationSeconds',${Math.floor(elapsed)}) FROM closed
      ON CONFLICT(idempotency_key) DO NOTHING RETURNING user_id,amount,xp_awarded
    ) UPDATE reward_users u SET last_mined_at=NOW(),updated_at=NOW(),axp_balance=u.axp_balance+l.amount,lifetime_axp=u.lifetime_axp+l.amount,xp=u.xp+l.xp_awarded,level=1+FLOOR((u.xp+l.xp_awarded)/500.0)::int
      FROM ledger l WHERE u.id=l.user_id RETURNING (SELECT row_to_json(closed) FROM closed) AS session`;
  if (!completed[0]?.session) return { ok: false as const, error: "Mining session was already completed." };
  await evaluateBadges(userId);
  return { ok: true as const, session: miningSessionDto(completed[0].session as Record<string, unknown>) };
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

export async function claimTask(userId: string, taskId: string, evidence: Record<string, unknown>, externallyVerified=false) {
  const tasks = await sql()`SELECT * FROM reward_tasks WHERE id=${taskId}::uuid AND enabled=TRUE AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>NOW()) AND EXISTS(SELECT 1 FROM reward_users WHERE id=${userId}::uuid AND status='active') LIMIT 1`;
  if (!tasks[0]) throw new Error("Task is unavailable.");
  const task = tasks[0];
  const cooldownHours = Math.max(1, Number(task.cooldown_hours || 24));
  const claimKey = task.repeat_mode === "daily" ? new Date().toISOString().slice(0, 10) : task.repeat_mode === "cooldown" ? `period:${Math.floor(Date.now()/(cooldownHours*3_600_000))}` : "once";
  const walletReady=task.category==="wallet_connect"&&(await sql()`SELECT 1 FROM reward_identities WHERE user_id=${userId}::uuid AND provider='wallet' LIMIT 1`).length>0;
  const autoVerified = task.category === "website_visit" || walletReady || externallyVerified;
  const status = autoVerified ? "verified" : "pending";
  const claims = await sql()`INSERT INTO reward_task_claims(user_id,task_id,claim_key,status,evidence,awarded_axp) VALUES(${userId}::uuid,${taskId}::uuid,${claimKey},${status},${JSON.stringify(evidence)}::jsonb,${autoVerified ? Number(task.reward_axp) : 0}) ON CONFLICT(user_id,task_id,claim_key) DO NOTHING RETURNING id,status,awarded_axp`;
  if (!claims[0]) { await recordRiskEvent(userId,"duplicate_task_claim",10,{taskId,claimKey}); return null; }
  const provider=socialProvider(String(task.category));if(provider)await recordSocialVerification(userId,provider,String(claims[0].id),autoVerified,autoVerified?Number(task.reward_axp):0,{category:task.category});
  if (autoVerified) { await awardPoints(userId, Number(task.reward_axp), "task", String(claims[0].id), `task:${claims[0].id}`,Number(task.reward_xp||0)); await sql()`UPDATE reward_task_claims SET verified_at=NOW(),verification_message='Verified automatically' WHERE id=${String(claims[0].id)}::uuid`; await evaluateBadges(userId); }
  return claims[0];
}
export async function taskVerificationContext(userId:string,taskId:string){const [tasks,identities]=await Promise.all([sql()`SELECT * FROM reward_tasks WHERE id=${taskId}::uuid AND enabled=TRUE LIMIT 1`,sql()`SELECT provider,provider_user_id FROM reward_identities WHERE user_id=${userId}::uuid`]);return tasks[0]?{task:tasks[0],identities}:null;}
export async function systemTaskEligible(userId:string,category:string){if(category==="daily_login")return Boolean((await sql()`SELECT 1 FROM reward_point_ledger WHERE user_id=${userId}::uuid AND reason='daily_login' AND created_at::date=CURRENT_DATE LIMIT 1`)[0]);if(category==="daily_mining")return Boolean((await sql()`SELECT 1 FROM reward_point_ledger WHERE user_id=${userId}::uuid AND reason='mining' AND created_at>=NOW()-INTERVAL '24 hours' LIMIT 1`)[0]);if(category==="referral_invite")return Boolean((await sql()`SELECT 1 FROM reward_users WHERE referred_by=${userId}::uuid LIMIT 1`)[0]);return false;}
export async function completePendingTask(userId:string,taskId:string,message:string){const rows=await sql()`UPDATE reward_task_claims SET status='verified',verified_at=NOW(),verification_message=${message},awarded_axp=(SELECT reward_axp FROM reward_tasks WHERE id=task_id) WHERE id=(SELECT id FROM reward_task_claims WHERE user_id=${userId}::uuid AND task_id=${taskId}::uuid AND status IN ('pending','review') ORDER BY created_at DESC LIMIT 1) RETURNING id,awarded_axp,(SELECT reward_xp FROM reward_tasks WHERE id=task_id) AS reward_xp,(SELECT category FROM reward_tasks WHERE id=task_id) AS category`;if(!rows[0])return null;await awardPoints(userId,Number(rows[0].awarded_axp),"task",String(rows[0].id),`task:${rows[0].id}`,Number(rows[0].reward_xp));const provider=socialProvider(String(rows[0].category));if(provider)await recordSocialVerification(userId,provider,String(rows[0].id),true,Number(rows[0].awarded_axp),{message});await evaluateBadges(userId);return rows[0];}

export async function awardPoints(userId: string, amount: number, reason: "task" | "referral" | "achievement" | "admin_adjustment", referenceId: string, idempotencyKey: string,xpOverride?:number) {
  const xp = xpOverride ?? (reason === "task" ? Math.floor(amount * await rewardSetting("task_xp_percent", 25) / 100) : 0);
  return sql()`WITH ledger AS (INSERT INTO reward_point_ledger(user_id,amount,xp_awarded,reason,reference_id,idempotency_key) VALUES(${userId}::uuid,${amount},${xp},${reason},${referenceId}::uuid,${idempotencyKey}) ON CONFLICT(idempotency_key) DO NOTHING RETURNING user_id,amount,xp_awarded) UPDATE reward_users u SET axp_balance=u.axp_balance+l.amount,lifetime_axp=u.lifetime_axp+GREATEST(l.amount,0),xp=u.xp+l.xp_awarded,level=1+FLOOR((u.xp+l.xp_awarded)/500.0)::int,updated_at=NOW() FROM ledger l WHERE u.id=l.user_id RETURNING u.*`;
}

export async function recordRiskEvent(userId: string | null, eventType: string, severity: number, details: Record<string, unknown>) { await sql()`INSERT INTO reward_anti_cheat_events(user_id,event_type,severity,details) VALUES(${userId}::uuid,${eventType},${Math.max(1,Math.min(100,severity))},${JSON.stringify(details)}::jsonb)`; if(userId)await sql()`UPDATE reward_users SET risk_score=LEAST(100,risk_score+${severity}),status=CASE WHEN risk_score+${severity}>=60 THEN 'review' ELSE status END WHERE id=${userId}::uuid`; }

export async function evaluateBadges(userId: string) { await sql()`INSERT INTO reward_user_badges(user_id,badge_id) SELECT ${userId}::uuid,b.id FROM reward_badges b JOIN reward_users u ON u.id=${userId}::uuid WHERE b.enabled=TRUE AND ((b.slug='first-mine' AND EXISTS(SELECT 1 FROM reward_point_ledger l WHERE l.user_id=u.id AND l.reason='mining')) OR (b.slug='miner-7' AND (SELECT COUNT(*) FROM reward_point_ledger l WHERE l.user_id=u.id AND l.reason='mining')>=7) OR (b.slug='referral-5' AND (SELECT COUNT(*) FROM reward_users r WHERE r.referred_by=u.id)>=5) OR (b.slug='level-5' AND u.level>=5) OR (b.slug='streak-7' AND u.login_streak>=7) OR (b.slug='axp-1000' AND u.lifetime_axp>=1000)) ON CONFLICT DO NOTHING`; }

async function rewardSetting(key: string, fallback: number) { const rows=await sql()`SELECT value FROM reward_settings WHERE key=${key}`; return rows[0]?Number(rows[0].value):fallback; }
export async function adminRewardSettings(){return sql()`SELECT key,value FROM reward_settings ORDER BY key`;}
export async function adminUpdateRewardSettings(settings:Record<string,number>,admin:string){for(const [key,value] of Object.entries(settings)){if(!["mining_axp","mining_cooldown_hours","mining_xp","daily_login_axp","daily_login_xp","task_xp_percent","referrer_axp","referred_axp"].includes(key)||!Number.isInteger(value)||value<0||value>100000)throw new Error("Invalid reward setting.");await sql()`INSERT INTO reward_settings(key,value,updated_by,updated_at) VALUES(${key},${value},${admin},NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=NOW()`;}return adminRewardSettings();}

export async function adminListTasks() { return sql()`SELECT t.*,(SELECT COUNT(*)::int FROM reward_task_claims c WHERE c.task_id=t.id AND c.status='verified') AS completion_count FROM reward_tasks t ORDER BY sort_order,created_at DESC`; }
export type TaskInput={category:TaskCategory;group:TaskGroup;title:string;description:string;icon:string;rewardAxp:number;rewardXp:number;difficulty:TaskDifficulty;enabled:boolean;repeatMode:string;cooldownHours?:number|null;verificationMode:VerificationMode;verificationConfig?:Record<string,unknown>;taskUrl?:string|null};
export async function adminCreateTask(input:TaskInput){const rows=await sql()`INSERT INTO reward_tasks(category,task_group,title,description,icon,reward_axp,reward_xp,difficulty,enabled,repeat_mode,cooldown_hours,verification_mode,verification_config,task_url) VALUES(${input.category},${input.group},${input.title},${input.description},${input.icon},${input.rewardAxp},${input.rewardXp},${input.difficulty},${input.enabled},${input.repeatMode},${input.cooldownHours||null},${input.verificationMode},${JSON.stringify(input.verificationConfig||{})}::jsonb,${input.taskUrl||null}) RETURNING *`;return rows[0];}
export async function adminUpdateTask(id:string,input:TaskInput){const rows=await sql()`UPDATE reward_tasks SET category=${input.category},task_group=${input.group},title=${input.title},description=${input.description},icon=${input.icon},reward_axp=${input.rewardAxp},reward_xp=${input.rewardXp},difficulty=${input.difficulty},enabled=${input.enabled},repeat_mode=${input.repeatMode},cooldown_hours=${input.cooldownHours||null},verification_mode=${input.verificationMode},verification_config=${JSON.stringify(input.verificationConfig||{})}::jsonb,task_url=${input.taskUrl||null},updated_at=NOW() WHERE id=${id}::uuid RETURNING *`;return rows[0]||null;}
export async function adminDuplicateTask(id:string){const rows=await sql()`INSERT INTO reward_tasks(category,task_group,title,description,icon,reward_axp,reward_xp,difficulty,enabled,repeat_mode,cooldown_hours,verification_mode,verification_config,task_url,sort_order) SELECT category,task_group,title||' (Copy)',description,icon,reward_axp,reward_xp,difficulty,FALSE,repeat_mode,cooldown_hours,verification_mode,verification_config,task_url,sort_order FROM reward_tasks WHERE id=${id}::uuid RETURNING *`;return rows[0]||null;}
export async function adminDeleteTask(id: string) { const rows = await sql()`DELETE FROM reward_tasks WHERE id=${id}::uuid RETURNING id`; return Boolean(rows[0]); }
export async function adminStats() { const rows = await sql()`SELECT (SELECT COUNT(*) FROM reward_users) AS users,(SELECT COALESCE(SUM(lifetime_axp),0) FROM reward_users) AS axp_earned,(SELECT COUNT(*) FROM reward_task_claims WHERE status='pending') AS pending_claims,(SELECT COUNT(*) FROM reward_users WHERE status='review') AS flagged_users`; return rows[0]; }
export async function adminListUsers(limit=100){return sql()`SELECT u.id,u.display_name,u.axp_balance,u.lifetime_axp,u.xp,u.level,u.status,u.risk_score,u.created_at,COUNT(r.id)::int AS referrals FROM reward_users u LEFT JOIN reward_users r ON r.referred_by=u.id GROUP BY u.id ORDER BY u.created_at DESC LIMIT ${Math.min(limit,250)}`;}
export async function adminUpdateUser(id:string,status:"active"|"suspended"|"review"){const rows=await sql()`UPDATE reward_users SET status=${status},updated_at=NOW() WHERE id=${id}::uuid RETURNING id,status`;return rows[0]||null;}

type SocialProvider="telegram"|"x"|"youtube";
function socialProvider(category:string):SocialProvider|null{return category.startsWith("telegram_")?"telegram":category.startsWith("x_")?"x":category.startsWith("youtube_")?"youtube":null;}
async function recordSocialVerification(userId:string,provider:SocialProvider,claimId:string,verified:boolean,rewardAmount:number,metadata:Record<string,unknown>){await sql()`INSERT INTO reward_social_verifications(user_id,provider,verified,verification_date,reward_claimed,reward_amount,task_claim_id,verification_data,updated_at) VALUES(${userId}::uuid,${provider},${verified},${verified?new Date().toISOString():null},${verified},${rewardAmount},${claimId}::uuid,${JSON.stringify(metadata)}::jsonb,NOW()) ON CONFLICT(user_id,provider) DO UPDATE SET verified=reward_social_verifications.verified OR EXCLUDED.verified,verification_date=COALESCE(reward_social_verifications.verification_date,EXCLUDED.verification_date),reward_claimed=reward_social_verifications.reward_claimed OR EXCLUDED.reward_claimed,reward_amount=GREATEST(reward_social_verifications.reward_amount,EXCLUDED.reward_amount),task_claim_id=EXCLUDED.task_claim_id,verification_data=EXCLUDED.verification_data,updated_at=NOW()`;await sql()`INSERT INTO reward_social_verification_history(user_id,provider,event_type,task_claim_id,metadata) VALUES(${userId}::uuid,${provider},${verified?"verified":"submitted"},${claimId}::uuid,${JSON.stringify(metadata)}::jsonb)`;}
export async function adminSocialSettings(){return sql()`SELECT provider,url,enabled,updated_at FROM reward_social_settings ORDER BY provider`;}
export async function adminUpdateSocialSettings(values:Record<string,{url:string;enabled:boolean}>,admin:string){for(const [provider,value] of Object.entries(values)){if(!["website","telegram","x","youtube"].includes(provider)||!URL.canParse(value.url)||new URL(value.url).protocol!=="https:")throw new Error("Invalid social setting.");await sql()`INSERT INTO reward_social_settings(provider,url,enabled,updated_by,updated_at) VALUES(${provider},${value.url},${value.enabled},${admin},NOW()) ON CONFLICT(provider) DO UPDATE SET url=EXCLUDED.url,enabled=EXCLUDED.enabled,updated_by=EXCLUDED.updated_by,updated_at=NOW()`;}return adminSocialSettings();}
export async function adminSocialStats(){return sql()`SELECT provider,COUNT(*)::int AS submissions,COUNT(*) FILTER(WHERE verified)::int AS verified,COUNT(*) FILTER(WHERE reward_claimed)::int AS rewarded,COALESCE(SUM(reward_amount),0) AS rewards FROM reward_social_verifications GROUP BY provider ORDER BY provider`;}
export async function adminCompletedSocialUsers(){return sql()`SELECT v.user_id,u.display_name,v.provider,v.verification_date,v.reward_claimed,v.reward_amount FROM reward_social_verifications v JOIN reward_users u ON u.id=v.user_id WHERE v.verified=TRUE ORDER BY v.verification_date DESC LIMIT 250`;}
export async function adminResetSocialVerification(userId:string,provider:SocialProvider,admin:string){const rows=await sql()`UPDATE reward_social_verifications SET verified=FALSE,verification_date=NULL,reward_claimed=FALSE,reward_amount=0,task_claim_id=NULL,verification_data='{}'::jsonb,updated_at=NOW() WHERE user_id=${userId}::uuid AND provider=${provider} RETURNING user_id`;if(rows[0])await sql()`INSERT INTO reward_social_verification_history(user_id,provider,event_type,metadata) VALUES(${userId}::uuid,${provider},'reset',jsonb_build_object('admin',${admin}))`;return Boolean(rows[0]);}
export async function adminListPendingClaims(){return sql()`SELECT c.id,c.user_id,c.task_id,c.status,c.evidence,c.created_at,u.display_name,t.title,t.category,t.reward_axp,t.reward_xp FROM reward_task_claims c JOIN reward_users u ON u.id=c.user_id JOIN reward_tasks t ON t.id=c.task_id WHERE c.status IN ('pending','review') ORDER BY c.created_at ASC LIMIT 250`;}
export async function adminReviewClaim(claimId:string,decision:"verified"|"rejected",admin:string){if(decision==="rejected"){const rows=await sql()`UPDATE reward_task_claims SET status='rejected',reviewed_by=${admin},reviewed_at=NOW(),verification_message='Rejected by administrator' WHERE id=${claimId}::uuid AND status IN ('pending','review') RETURNING id,user_id,task_id`;if(rows[0]){const task=await sql()`SELECT category FROM reward_tasks WHERE id=${String(rows[0].task_id)}::uuid`;const provider=socialProvider(String(task[0]?.category||""));if(provider)await sql()`INSERT INTO reward_social_verification_history(user_id,provider,event_type,task_claim_id,metadata) VALUES(${String(rows[0].user_id)}::uuid,${provider},'rejected',${claimId}::uuid,jsonb_build_object('admin',${admin}))`;}return rows[0]||null;}const rows=await sql()`UPDATE reward_task_claims c SET status='verified',verified_at=NOW(),reviewed_by=${admin},reviewed_at=NOW(),verification_message='Verified by administrator',awarded_axp=t.reward_axp FROM reward_tasks t WHERE c.id=${claimId}::uuid AND c.task_id=t.id AND c.status IN ('pending','review') RETURNING c.id,c.user_id,c.task_id,c.awarded_axp,t.reward_xp,t.category`;if(!rows[0])return null;await awardPoints(String(rows[0].user_id),Number(rows[0].awarded_axp),"task",claimId,`task:${claimId}`,Number(rows[0].reward_xp));const provider=socialProvider(String(rows[0].category));if(provider)await recordSocialVerification(String(rows[0].user_id),provider,claimId,true,Number(rows[0].awarded_axp),{admin});await evaluateBadges(String(rows[0].user_id));return rows[0];}
export async function healthCheck(){const rows=await sql()`SELECT 1 AS ok,(SELECT COUNT(*)::int FROM schema_migrations) AS migrations`;return{database:rows[0]?.ok===1,migrations:Number(rows[0]?.migrations||0)};}
