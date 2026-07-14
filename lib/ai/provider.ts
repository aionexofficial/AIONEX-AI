import type { AssistantProvider } from "@/types/assistant";
import { LocalAionexProvider } from "./local-provider";
import { OpenAIProvider } from "./openai-provider";

export function createAssistantProvider(): AssistantProvider {
  const provider = process.env.AIONEX_AI_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (provider === "local") {
    return new LocalAionexProvider();
  }

  if (apiKey) {
    return new OpenAIProvider(apiKey, process.env.OPENAI_MODEL?.trim() || "gpt-5");
  }

  return new LocalAionexProvider();
}
