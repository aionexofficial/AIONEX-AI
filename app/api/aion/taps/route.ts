import { submitTapBatch } from "@/lib/aion/service";
import type { TapBatchInput } from "@/lib/aion/types";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";
import { recordRiskEvent } from "@/lib/rewards/db";
import { getRewardUserId } from "@/lib/rewards/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (exceedsContentLength(request, 8192)) return Response.json({ error: "Request is too large." }, { status: 413 });
  const userId = await getRewardUserId();
  if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body = await request.json() as Partial<TapBatchInput>;
    const input: TapBatchInput = { idempotencyKey: String(body.idempotencyKey ?? ""), sessionId: String(body.sessionId ?? ""), tapCount: Number(body.tapCount), startedAt: String(body.startedAt ?? ""), endedAt: String(body.endedAt ?? ""), deviceId: String(body.deviceId ?? "") };
    const requestIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const result = await submitTapBatch(userId, input, requestIp);
    return Response.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tap batch could not be processed.";
    const suspicious = ["Invalid tap session.", "Invalid tap batch.", "Invalid tap timestamps."].includes(message);
    if (suspicious) await recordRiskEvent(userId, "invalid_aion_tap_batch", 2, { reason: message }).catch(() => undefined);
    else logError("aion.taps", error);
    const publicMessage = message === "AION earning is temporarily paused." ? message : suspicious ? message : "Tap batch could not be processed.";
    return Response.json({ error: publicMessage }, { status: message.includes("paused") ? 503 : 400 });
  }
}
