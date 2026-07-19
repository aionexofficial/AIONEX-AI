import { findOrCreateIdentity,getProfile } from "@/lib/rewards/db";
import { setRewardSession } from "@/lib/rewards/session";
import { verifyTelegramInitData } from "@/lib/rewards/telegram";
import { logError,logInfo } from "@/lib/observability/logger";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";
import {getAionState} from "@/lib/aion/service";
import { ensureDailyTasksForUser } from "@/lib/rewards/daily-tasks";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  if (exceedsContentLength(request, 16_384)) return Response.json({ error: "Request is too large." }, { status: 413 });
  try {
    const { initData } = await request.json() as { initData?: string };
    const user = initData ? verifyTelegramInitData(initData) : null;
    if (!user){logInfo("rewards.auth.telegram.rejected",{hasInitData:Boolean(initData),initDataLength:initData?.length||0});return Response.json({ error: "Invalid or expired Telegram authentication." }, { status: 401 });}
    const userId = await findOrCreateIdentity("telegram", String(user.id), { username: user.username, firstName: user.first_name, lastName: user.last_name, photoUrl: user.photo_url, languageCode: user.language_code });
    await setRewardSession(userId);
    await ensureDailyTasksForUser(userId);
    const[profile,aion]=await Promise.all([getProfile(userId),getAionState(userId)]);if(!profile||!aion)throw new Error("Authenticated Telegram profile provisioning failed.");
    logInfo("rewards.auth.telegram.success",{userId,telegramUserIdSuffix:String(user.id).slice(-4),profileProvisioned:true});
    return Response.json({ ok: true,profile,aion }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { logError("rewards.auth.telegram", error); return Response.json({ error: "Telegram authentication failed." }, { status: 500 }); }
}
