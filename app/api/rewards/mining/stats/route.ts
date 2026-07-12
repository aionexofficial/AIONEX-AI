import { miningStats } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
export async function GET(){const auth=await requireRewardUser();if(!auth)return unauthorized();const row=await miningStats(auth.userId);return Response.json({stats:{claims:Number(row.claims),earned:Number(row.earned),lastClaim:row.last_claim?new Date(String(row.last_claim)).toISOString():null,cooldownHours:Number(row.cooldown_hours)}});}
