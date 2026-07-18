import {prestigeUser} from "@/lib/aion/gameplay";
import {isSameOrigin} from "@/lib/http/request";
import {getRewardUserId} from "@/lib/rewards/session";
export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({error:"Invalid request origin."},{status:403});const userId=await getRewardUserId();if(!userId)return Response.json({error:"Authentication required."},{status:401});try{return Response.json({result:await prestigeUser(userId)});}catch(error){return Response.json({error:error instanceof Error?error.message:"Prestige failed."},{status:409});}}
