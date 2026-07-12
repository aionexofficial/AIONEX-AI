import { mine } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
import { isSameOrigin } from "@/lib/http/request";
export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});const auth=await requireRewardUser();if(!auth)return unauthorized();const result=await mine(auth.userId);return result?Response.json({result}):Response.json({error:"Mining is available once every 24 hours."},{status:409});}
