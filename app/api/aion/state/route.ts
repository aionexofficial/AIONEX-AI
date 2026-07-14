import { getAionState } from "@/lib/aion/service";
import { getRewardUserId } from "@/lib/rewards/session";
import { logError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getRewardUserId();
  if (!userId) return Response.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const state = await getAionState(userId);
    return state ? Response.json({ state }, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "AION profile not found." }, { status: 404 });
  } catch (error) {
    logError("aion.state", error);
    return Response.json({ error: "AION state is temporarily unavailable." }, { status: 503 });
  }
}
