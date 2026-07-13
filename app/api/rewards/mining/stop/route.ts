import { stopMiningSession } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
import { isSameOrigin } from "@/lib/http/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireRewardUser();
  if (!auth) return unauthorized();
  const result = await stopMiningSession(auth.userId);
  return result.ok
    ? Response.json({ session: result.session })
    : Response.json({ error: result.error }, { status: 409 });
}
