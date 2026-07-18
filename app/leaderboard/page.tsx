import {LeaderboardPage} from "@/components/rewards/leaderboard-page";
import {aionLeaderboard} from "@/lib/aion/leaderboard";
import {getRewardUserId} from "@/lib/rewards/session";
export const dynamic="force-dynamic";
export default async function Page(){let data:Awaited<ReturnType<typeof aionLeaderboard>>={metric:"mining",period:"all",page:1,limit:25,total:0,ownRank:null,leaders:[]};try{data=await aionLeaderboard("mining",1,25,await getRewardUserId(),"all");}catch{}return <LeaderboardPage initial={data}/>;}
