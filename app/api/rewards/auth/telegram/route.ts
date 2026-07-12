import { findOrCreateIdentity } from "@/lib/rewards/db";
import { getRewardUserId, setRewardSession } from "@/lib/rewards/session";
import { verifyTelegramInitData } from "@/lib/rewards/telegram";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  try {
    const { initData } = await request.json() as { initData?: string };
    const user = initData ? verifyTelegramInitData(initData) : null;
    if (!user) return Response.json({ error: "Invalid or expired Telegram authentication." }, { status: 401 });
    const userId = await findOrCreateIdentity("telegram", String(user.id), { username: user.username, firstName: user.first_name, lastName: user.last_name }, await getRewardUserId());
    await setRewardSession(userId);
    return Response.json({ ok: true });
  } catch (error) { logError("rewards.auth.telegram", error); return Response.json({ error: "Telegram authentication failed." }, { status: 500 }); }
}
