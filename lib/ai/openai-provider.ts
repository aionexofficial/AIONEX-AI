import type { AssistantProvider } from "@/types/assistant";
import { AIONEX_SYSTEM_PROMPT } from "./knowledge";

type ResponseEvent = { type?: string; delta?: string };

export class OpenAIProvider implements AssistantProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async *stream(messages: Parameters<AssistantProvider["stream"]>[0], signal: AbortSignal) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal,
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, instructions: AIONEX_SYSTEM_PROMPT, input: messages, stream: true }),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 200)}`);
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        const event = JSON.parse(line.slice(6)) as ResponseEvent;
        if (event.type === "response.output_text.delta" && event.delta) yield event.delta;
      }
    }
  }
}
