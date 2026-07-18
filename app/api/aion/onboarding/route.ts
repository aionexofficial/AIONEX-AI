import { completeAionOnboarding } from "@/lib/aion/service";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";
import { getRewardUserId } from "@/lib/rewards/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (exceedsContentLength(request, 4096)) return Response.json({ error: "Request is too large." }, { status: 413 });
  const userId = await getRewardUserId();
  if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body = await request.json() as { characterName?: string; username?: string; energyColor?: string };
    const state = await completeAionOnboarding(userId, { characterName: String(body.characterName ?? ""), username: String(body.username ?? ""), energyColor: String(body.energyColor ?? "") });
    return Response.json({ state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error && error.message === "Username is unavailable." ? error.message : "Invalid AION profile.";
    if (message !== "Username is unavailable.") logError("aion.onboarding", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
