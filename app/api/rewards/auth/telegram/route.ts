import { findOrCreateIdentity } from "@/lib/rewards/db";
import { getRewardUserId, setRewardSession } from "@/lib/rewards/session";
import { verifyTelegramInitData } from "@/lib/rewards/telegram";
import { logError } from "@/lib/observability/logger";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  if (exceedsContentLength(request, 16_384)) return Response.json({ error: "Request is too large." }, { status: 413 });
  try {
    const { initData } = await request.json() as { initData?: string };
    const user = initData ? verifyTelegramInitData(initData) : null;
    if (!user) return Response.json({ error: "Invalid or expired Telegram authentication." }, { status: 401 });
    const userId = await findOrCreateIdentity("telegram", String(user.id), { username: user.username, firstName: user.first_name, lastName: user.last_name, photoUrl: user.photo_url, languageCode: user.language_code }, await getRewardUserId());
    await setRewardSession(userId);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { logError("rewards.auth.telegram", error); return Response.json({ error: "Telegram authentication failed." }, { status: 500 }); }
}
