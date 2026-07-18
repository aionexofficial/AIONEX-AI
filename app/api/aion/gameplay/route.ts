import {gameplayOverview} from "@/lib/aion/gameplay";
import {getRewardUserId} from "@/lib/rewards/session";
export async function GET(){const userId=await getRewardUserId();if(!userId)return Response.json({error:"Authentication required."},{status:401});return Response.json(await gameplayOverview(userId),{headers:{"Cache-Control":"no-store"}});}
