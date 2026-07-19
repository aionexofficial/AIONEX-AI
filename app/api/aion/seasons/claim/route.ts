import {claimSeasonAchievement,claimSeasonReward} from "@/lib/aion/gameplay";
import {exceedsContentLength,isSameOrigin} from "@/lib/http/request";
import {getRewardUserId} from "@/lib/rewards/session";

export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({error:"Invalid request origin."},{status:403});if(exceedsContentLength(request,4096))return Response.json({error:"Request is too large."},{status:413});const userId=await getRewardUserId();if(!userId)return Response.json({error:"Authentication required."},{status:401});try{const body=await request.json();const result=body.type==="achievement"?await claimSeasonAchievement(userId,String(body.achievementKey||"")):await claimSeasonReward(userId,String(body.seasonKey||""),String(body.rewardKey||""));return Response.json({result});}catch(error){return Response.json({error:error instanceof Error?error.message:"Season reward could not be claimed."},{status:409});}}
