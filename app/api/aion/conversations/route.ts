import { recentConversation } from "@/lib/aion/conversations";
import { logError } from "@/lib/observability/logger";
import { getRewardUserId } from "@/lib/rewards/session";

export const dynamic = "force-dynamic";
export async function GET() {
  const userId = await getRewardUserId();
  if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
  try { return Response.json({ conversation: await recentConversation(userId) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { logError("aion.conversations", error); return Response.json({ error: "Conversation history is unavailable." }, { status: 503 }); }
}
