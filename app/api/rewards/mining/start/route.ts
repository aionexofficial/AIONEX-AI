import { startMiningSession } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
import { isSameOrigin } from "@/lib/http/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireRewardUser();
  if (!auth) return unauthorized();
  const result = await startMiningSession(auth.userId);
  return result.ok
    ? Response.json({ session: result.session })
    : Response.json({ error: result.error, session: result.session }, { status: 409 });
}
