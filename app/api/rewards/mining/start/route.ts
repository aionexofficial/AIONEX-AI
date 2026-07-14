import { startMiningSession } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
import { isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireRewardUser();
  if (!auth) return unauthorized();
  try {
    const result = await startMiningSession(auth.userId);
    return result.ok
      ? Response.json({ session: result.session })
      : Response.json({ error: result.error, session: result.session }, { status: 409 });
  } catch (error) {
    logError("rewards.mining.start", error);
    return Response.json({ error: "Mining could not be started." }, { status: 500 });
  }
}
