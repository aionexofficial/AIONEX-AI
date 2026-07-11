import type { AssistantProvider } from "@/types/assistant";
import { answerFromKnowledge } from "./knowledge";

const delay = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal.addEventListener("abort", () => {
    clearTimeout(timer);
    reject(new DOMException("Aborted", "AbortError"));
  }, { once: true });
});

export class LocalAionexProvider implements AssistantProvider {
  async *stream(messages: Parameters<AssistantProvider["stream"]>[0], signal: AbortSignal) {
    const question = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const words = answerFromKnowledge(question).split(/(\s+)/);
    for (const word of words) {
      if (signal.aborted) return;
      await delay(10 + Math.random() * 18, signal);
      yield word;
    }
  }
}
