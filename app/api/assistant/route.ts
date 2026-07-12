import { createAssistantProvider } from "@/lib/ai/provider";
import type { ChatRequest } from "@/types/assistant";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (exceedsContentLength(request, 425_000)) return Response.json({ error: "Request is too large." }, { status: 413 });
  try {
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

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of createAssistantProvider().stream(messages, request.signal)) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          if (request.signal.aborted) return controller.close();
          logError("assistant.stream", error);
          controller.error(error);
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
  } catch (error) {
    logError("assistant.request", error);
    return Response.json({ error: "The request could not be processed." }, { status: 400 });
  }
}
