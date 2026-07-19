import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT
  (SELECT COUNT(*) FROM reward_users)::int users,
  (SELECT COALESCE(SUM(axp_balance),0) FROM reward_users)::bigint balances,
  (SELECT COALESCE(SUM(lifetime_axp),0) FROM reward_users)::bigint lifetime,
  (SELECT COALESCE(SUM(xp),0) FROM reward_users)::bigint xp,
  (SELECT COALESCE(SUM(level),0) FROM reward_users)::bigint levels,
  (SELECT COALESCE(SUM(login_streak),0) FROM reward_users)::bigint login_streaks,
  (SELECT COUNT(*) FROM reward_identities)::int identities,
  (SELECT COUNT(*) FROM reward_mining_sessions)::int mining,
  (SELECT COUNT(*) FROM aion_tap_batches)::int taps,
  (SELECT COUNT(*) FROM reward_task_claims)::int claims,
  (SELECT COUNT(*) FROM reward_point_ledger)::int ledger,
  (SELECT COUNT(*) FROM reward_user_badges)::int achievements,
  (SELECT COUNT(*) FROM aion_season_progress)::int season_progress,
  (SELECT COUNT(*) FROM aion_economy_transactions)::int transactions,
  (SELECT COUNT(*) FROM aion_mystery_chest_opens)::int chest_opens,
  (SELECT COUNT(*) FROM aion_prestige_history)::int prestige_history,
  (SELECT COUNT(*) FROM reward_users WHERE referred_by IS NOT NULL)::int referrals,
  (SELECT COUNT(*) FROM aion_character_profiles)::int profiles,
  (SELECT COUNT(*) FROM schema_migrations)::int migrations,
  (SELECT COUNT(*) FROM reward_identities i LEFT JOIN reward_users u ON u.id=i.user_id WHERE u.id IS NULL)::int orphan_identities,
  (SELECT COUNT(*) FROM aion_character_profiles p LEFT JOIN reward_users u ON u.id=p.user_id WHERE u.id IS NULL)::int orphan_profiles,
  (SELECT COUNT(*) FROM reward_point_ledger l LEFT JOIN reward_users u ON u.id=l.user_id WHERE u.id IS NULL)::int orphan_ledger`;
console.log(JSON.stringify(rows[0]));
