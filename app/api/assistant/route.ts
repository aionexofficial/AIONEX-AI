import { createAssistantProvider } from "@/lib/ai/provider";
import type { ChatRequest } from "@/types/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
          controller.error(error);
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
  } catch {
    return Response.json({ error: "The request could not be processed." }, { status: 400 });
  }
}
