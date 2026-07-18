import { consumeAuthAttempt } from "@/lib/admin/rate-limit";
import { getAionState, updateAionProfile } from "@/lib/aion/service";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";
import { getRewardUserId } from "@/lib/rewards/session";

export async function GET() { const userId = await getRewardUserId(); if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 }); return Response.json({ state: await getAionState(userId) }, { headers: { "Cache-Control": "no-store" } }); }
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (exceedsContentLength(request, 8192)) return Response.json({ error: "Request is too large." }, { status: 413 });
  const userId = await getRewardUserId(); if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
  const limit = await consumeAuthAttempt(request, `aion_profile:${userId}`, 5); if (!limit.allowed) return Response.json({ error: "Profile update limit reached." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try { const body = await request.json(); return Response.json({ state: await updateAionProfile(userId, { characterName: String(body.characterName || ""), username: String(body.username || ""), energyColor: String(body.energyColor || ""), eyeColor: String(body.eyeColor || ""), aura: String(body.aura || ""), background: String(body.background || ""), profileFrame: String(body.profileFrame || "") }) }); }
  catch (error) { return Response.json({ error: error instanceof Error && error.message === "Username is unavailable." ? error.message : "Invalid AION profile." }, { status: 400 }); }
}
