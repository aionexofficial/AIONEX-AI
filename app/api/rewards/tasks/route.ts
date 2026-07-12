import { listTasks } from "@/lib/rewards/db";
import { getRewardUserId } from "@/lib/rewards/session";
export async function GET() { return Response.json({ tasks: await listTasks(await getRewardUserId()) }); }
