import { claimTask } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
import { isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 }); const auth=await requireRewardUser(); if(!auth)return unauthorized(); try { const body=await request.json().catch(()=>({})) as { evidence?: Record<string,unknown> }; const claim=await claimTask(auth.userId,(await params).id,body.evidence||{}); return claim ? Response.json({ claim },{status:201}) : Response.json({error:"Task already claimed for this period."},{status:409}); } catch(error){logError("rewards.task.claim",error);return Response.json({error:error instanceof Error && error.message==="Task is unavailable."?error.message:"Task claim failed."},{status:400});} }
