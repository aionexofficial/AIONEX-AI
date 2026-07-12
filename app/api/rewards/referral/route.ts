import { applyReferral } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
import { isSameOrigin } from "@/lib/http/request";
export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});const auth=await requireRewardUser();if(!auth)return unauthorized();const {code}=await request.json() as {code?:string};if(!code)return Response.json({error:"Referral code is required."},{status:400});return await applyReferral(auth.userId,code.trim().toUpperCase())?Response.json({ok:true}):Response.json({error:"Referral code is invalid or already applied."},{status:409});}
