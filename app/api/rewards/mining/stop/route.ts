import { stopMiningSession } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
import { isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireRewardUser();
  if (!auth) return unauthorized();
  try {
    const result = await stopMiningSession(auth.userId);
    return result.ok
      ? Response.json({ session: result.session })
      : Response.json({ error: result.error }, { status: 409 });
  } catch (error) {
    logError("rewards.mining.stop", error);
    return Response.json({ error: "Mining rewards could not be settled." }, { status: 500 });
  }
}
