import { miningStatus } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
export async function GET(){const auth=await requireRewardUser();if(!auth)return unauthorized();return Response.json(await miningStatus(auth.userId));}
