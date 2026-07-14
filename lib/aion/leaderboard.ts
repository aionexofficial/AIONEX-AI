import "server-only";

import { neon } from "@neondatabase/serverless";

export type AionLeaderboardMetric = "points" | "weekly_taps" | "level" | "referrals" | "achievements";
const orders: Record<AionLeaderboardMetric, string> = { points: "lifetime_axp", weekly_taps: "weekly_taps", level: "level", referrals: "referrals", achievements: "achievements" };
function db() { if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured."); return neon(process.env.DATABASE_URL); }

export async function aionLeaderboard(metric: AionLeaderboardMetric, page = 1, limit = 25, currentUserId?: string | null) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit))), offset = (Math.max(1, Math.floor(page)) - 1) * safeLimit, order = orders[metric];
  const rows = await db().query(`SELECT *,DENSE_RANK() OVER(ORDER BY ${order} DESC) AS rank,COUNT(*) OVER() AS total_users FROM (
    SELECT u.id,u.username,u.display_name,u.lifetime_axp,u.xp,u.level,
      COALESCE((SELECT SUM(b.accepted_taps) FROM aion_tap_batches b WHERE b.user_id=u.id AND b.server_received_at>=DATE_TRUNC('week',NOW())),0)::bigint AS weekly_taps,
      (SELECT COUNT(*) FROM reward_users r WHERE r.referred_by=u.id)::int AS referrals,
      (SELECT COUNT(*) FROM reward_user_badges a WHERE a.user_id=u.id)::int AS achievements,
      COALESCE((SELECT s.key FROM aion_character_stages s WHERE s.enabled=TRUE AND u.level BETWEEN s.min_level AND s.max_level ORDER BY s.min_level DESC LIMIT 1),'core') AS stage
    FROM reward_users u WHERE u.status='active'
  ) ranked ORDER BY ${order} DESC,id LIMIT $1 OFFSET $2`, [safeLimit, offset]);
  let ownRank: number | null = null;
  if (currentUserId) {
    const own = await db().query(`SELECT rank FROM (SELECT id,DENSE_RANK() OVER(ORDER BY ${order} DESC) rank FROM (
      SELECT u.id,u.lifetime_axp,u.level,COALESCE((SELECT SUM(b.accepted_taps) FROM aion_tap_batches b WHERE b.user_id=u.id AND b.server_received_at>=DATE_TRUNC('week',NOW())),0)::bigint weekly_taps,
      (SELECT COUNT(*) FROM reward_users r WHERE r.referred_by=u.id)::int referrals,(SELECT COUNT(*) FROM reward_user_badges a WHERE a.user_id=u.id)::int achievements FROM reward_users u WHERE u.status='active'
    ) scores) ranked WHERE id=$1::uuid`, [currentUserId]);
    ownRank = own[0] ? Number(own[0].rank) : null;
  }
  return { metric, page: Math.max(1, Math.floor(page)), limit: safeLimit, total: Number(rows[0]?.total_users || 0), ownRank, leaders: rows.map(row => ({ id: String(row.id), displayName: String(row.username ? `@${row.username}` : row.display_name).slice(0, 32), points: Number(row.lifetime_axp), weeklyTaps: Number(row.weekly_taps), level: Number(row.level), referrals: Number(row.referrals), achievements: Number(row.achievements), rank: Number(row.rank), stage: String(row.stage) })) };
}
