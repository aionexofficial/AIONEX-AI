import "server-only";

import {neon} from "@neondatabase/serverless";

export type AionLeaderboardMetric="points"|"mining"|"weekly_taps"|"xp"|"level"|"referrals"|"achievements";
export type AionLeaderboardPeriod="daily"|"weekly"|"monthly"|"all";
const orders:Record<AionLeaderboardMetric,string>={points:"points",mining:"mining_taps",weekly_taps:"mining_taps",xp:"period_xp",level:"level",referrals:"referrals",achievements:"achievements"};
const periods:Record<AionLeaderboardPeriod,string>={daily:"CURRENT_DATE",weekly:"DATE_TRUNC('week',NOW())",monthly:"DATE_TRUNC('month',NOW())",all:"'-infinity'::timestamptz"};
function db(){if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured.");return neon(process.env.DATABASE_URL);}

export async function aionLeaderboard(metric:AionLeaderboardMetric,page=1,limit=25,currentUserId?:string|null,period:AionLeaderboardPeriod="all"){
  const safeLimit=Math.max(1,Math.min(50,Math.floor(limit))),offset=(Math.max(1,Math.floor(page))-1)*safeLimit,order=orders[metric],periodStart=periods[period];
  const scoreQuery=`SELECT u.id,u.username,u.display_name,u.lifetime_axp,u.xp,u.level,
    COALESCE((SELECT SUM(b.accepted_taps) FROM aion_tap_batches b WHERE b.user_id=u.id AND b.server_received_at>=${periodStart}),0)::bigint AS mining_taps,
    COALESCE((SELECT SUM(l.amount) FROM reward_point_ledger l WHERE l.user_id=u.id AND l.reason='mining' AND l.created_at>=${periodStart}),0)::bigint AS points,
    COALESCE((SELECT SUM(l.xp_awarded) FROM reward_point_ledger l WHERE l.user_id=u.id AND l.created_at>=${periodStart}),0)::bigint AS period_xp,
    (SELECT COUNT(*) FROM reward_users r WHERE r.referred_by=u.id AND r.created_at>=${periodStart})::int AS referrals,
    (SELECT COUNT(*) FROM reward_user_badges a WHERE a.user_id=u.id AND a.awarded_at>=${periodStart})::int AS achievements,
    COALESCE((SELECT s.key FROM aion_character_stages s WHERE s.enabled=TRUE AND u.level BETWEEN s.min_level AND s.max_level ORDER BY s.min_level DESC LIMIT 1),'core') AS stage
    FROM reward_users u WHERE u.status='active'`;
  const rows=await db().query(`SELECT *,DENSE_RANK() OVER(ORDER BY ${order} DESC) AS rank,COUNT(*) OVER() AS total_users FROM (${scoreQuery}) scores ORDER BY ${order} DESC,id LIMIT $1 OFFSET $2`,[safeLimit,offset]);
  let ownRank:number|null=null;if(currentUserId){const own=await db().query(`SELECT rank FROM (SELECT id,DENSE_RANK() OVER(ORDER BY ${order} DESC) rank FROM (${scoreQuery}) own_scores) ranked WHERE id=$1::uuid`,[currentUserId]);ownRank=own[0]?Number(own[0].rank):null;}
  return{metric,period,page:Math.max(1,Math.floor(page)),limit:safeLimit,total:Number(rows[0]?.total_users||0),ownRank,leaders:rows.map(row=>({id:String(row.id),displayName:String(row.username?`@${row.username}`:row.display_name).slice(0,32),points:Number(row.points),weeklyTaps:Number(row.mining_taps),mining:Number(row.mining_taps),xp:Number(row.period_xp),level:Number(row.level),referrals:Number(row.referrals),achievements:Number(row.achievements),rank:Number(row.rank),stage:String(row.stage)}))};
}
