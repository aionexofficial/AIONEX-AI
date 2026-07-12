import { LeaderboardPage } from "@/components/rewards/leaderboard-page";
import { metricLeaderboard } from "@/lib/rewards/db";
export const dynamic="force-dynamic";
export default async function Page(){let rows:Awaited<ReturnType<typeof metricLeaderboard>>=[];try{rows=await metricLeaderboard("xp",50);}catch{}return <LeaderboardPage initial={rows.map(r=>({id:String(r.id),displayName:String(r.display_name),axp:Number(r.lifetime_axp),xp:Number(r.xp),referrals:Number(r.referrals),mining:Number(r.mining_claims),tasks:Number(r.completed_tasks),rank:Number(r.rank)}))}/>;}
