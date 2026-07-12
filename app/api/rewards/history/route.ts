import { rewardHistory } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
export async function GET(){const auth=await requireRewardUser();if(!auth)return unauthorized();const rows=await rewardHistory(auth.userId);return Response.json({history:rows.map(row=>({id:String(row.id),amount:Number(row.amount),xpAwarded:Number(row.xp_awarded),reason:String(row.reason),metadata:row.metadata||{},createdAt:new Date(String(row.created_at)).toISOString()}))});}
