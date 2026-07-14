import { createAssistantProvider } from "@/lib/ai/provider";
import type { ChatRequest } from "@/types/assistant";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";
import { getRewardUserId } from "@/lib/rewards/session";
import { consumeAuthAttempt } from "@/lib/admin/rate-limit";
import { openConversation, saveConversationMessage } from "@/lib/aion/conversations";
import { getAionState } from "@/lib/aion/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (exceedsContentLength(request, 425_000)) return Response.json({ error: "Request is too large." }, { status: 413 });
  const userId = await getRewardUserId();
  if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
  try {
    const limit = await consumeAuthAttempt(request, `aion_ai:${userId}`, 30);
    if (!limit.allowed) return Response.json({ error: "AION needs a short recharge before the next message." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const body = await request.json() as ChatRequest;
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 50) {
      return Response.json({ error: "A valid conversation is required." }, { status: 400 });
    }
    const messages = body.messages
      .filter((message) => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string")
      .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 8000) }))
      .filter((message) => message.content);
    if (!messages.length || messages.at(-1)?.role !== "user") {
      return Response.json({ error: "The last message must be from the user." }, { status: 400 });
    }
    const latest = messages.at(-1)!.content;
    const conversationId = await openConversation(userId, body.conversationId || null, latest);
    await saveConversationMessage(conversationId, "user", latest);
    const aion = await getAionState(userId);
    const contextualMessages = aion ? [{ role: "assistant" as const, content: `Context for this conversation: My character name is ${aion.character.name}, I am level ${aion.user.level} in the ${aion.stage.name} stage, with ${aion.energy.current}/${aion.energy.maximum} energy. Treat this as private user context and do not repeat it unless relevant.` }, ...messages] : messages;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        let answer = "";
        try {
          for await (const chunk of createAssistantProvider().stream(contextualMessages, request.signal)) {
            answer += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          if (answer.trim()) await saveConversationMessage(conversationId, "assistant", answer.trim());
          controller.close();
        } catch (error) {
          if (request.signal.aborted) return controller.close();
          logError("assistant.stream", error);
          controller.error(error);
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-AION-Conversation-ID": conversationId } });
  } catch (error) {
    logError("assistant.request", error);
    return Response.json({ error: "The request could not be processed." }, { status: 400 });
  }
}
