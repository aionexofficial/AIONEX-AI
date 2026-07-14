import { LeaderboardPage } from "@/components/rewards/leaderboard-page";
import { aionLeaderboard } from "@/lib/aion/leaderboard";
import { getRewardUserId } from "@/lib/rewards/session";
export const dynamic="force-dynamic";
export default async function Page(){let data:Awaited<ReturnType<typeof aionLeaderboard>>={metric:"points",page:1,limit:25,total:0,ownRank:null,leaders:[]};try{data=await aionLeaderboard("points",1,25,await getRewardUserId());}catch{}return <LeaderboardPage initial={data}/>;}
