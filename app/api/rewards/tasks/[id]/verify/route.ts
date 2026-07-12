import { completePendingTask } from "@/lib/rewards/db";
import { requireRewardUser,unauthorized } from "@/lib/rewards/api";
import { verifyTask } from "@/lib/rewards/verification";
import { isSameOrigin } from "@/lib/http/request";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});const auth=await requireRewardUser();if(!auth)return unauthorized();const id=(await params).id;const verification=await verifyTask(auth.userId,id);if(!verification.verified)return Response.json({error:verification.message,verification},{status:409});const claim=await completePendingTask(auth.userId,id,verification.message);return claim?Response.json({claim,verification}):Response.json({error:"No pending claim found."},{status:404});}
