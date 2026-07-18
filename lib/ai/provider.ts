import type { AssistantProvider } from "@/types/assistant";
import { LocalAionexProvider } from "./local-provider";
import { OllamaAssistantProvider } from "./ollama-provider";
import { OpenAIProvider } from "./openai-provider";

export function createAssistantProvider(): AssistantProvider {
  if (process.env.AIONEX_AI_PROVIDER === "ollama") {
    return new OllamaAssistantProvider(process.env.OLLAMA_MODEL ?? "llama3.2");
  }
  if (process.env.AIONEX_AI_PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL ?? "gpt-5");
  }
  return new LocalAionexProvider();
}
