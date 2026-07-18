import "server-only";

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export function parseOpenAIJsonText(payload: OpenAIResponsePayload) {
  const topLevel = payload.output_text?.trim();
  if (topLevel) return topLevel;

  const block = payload.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text
    ?.trim();

  if (block) return block;

  const combined = payload.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("")
    .trim();

  return combined || null;
}
