import { claimTask } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
import { isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";
import { verifyTask } from "@/lib/rewards/verification";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});const auth=await requireRewardUser();if(!auth)return unauthorized();try{const id=(await params).id;const body=await request.json().catch(()=>({})) as {evidence?:Record<string,unknown>};const verification=await verifyTask(auth.userId,id);const claim=await claimTask(auth.userId,id,{...(body.evidence||{}),verificationMessage:verification.message},verification.verified);return claim?Response.json({claim,verification},{status:201}):Response.json({error:"Task already claimed for this period."},{status:409});}catch(error){logError("rewards.task.claim",error);return Response.json({error:error instanceof Error&&error.message==="Task is unavailable."?error.message:"Task claim failed."},{status:400});}}
