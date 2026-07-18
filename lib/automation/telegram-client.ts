export type TelegramFormatting = { parseMode: "HTML" | "MarkdownV2"; sanitized: true };
type TelegramResult = { message_id?: number | string } | undefined;
type TelegramRequest = (method: string, payload: Record<string, unknown>) => Promise<TelegramResult>;

export function isTelegramParseEntitiesError(error: unknown) {
  return error instanceof Error && /can't parse entities|can't find end of the entity|parse entities/i.test(error.message);
}

export async function sendTelegramPublication(
  request: TelegramRequest,
  channelId: string,
  text: string,
  videoUrl?: string,
  formatting?: TelegramFormatting,
) {
  const method = videoUrl ? "sendVideo" : "sendMessage";
  const plainBody: Record<string, unknown> = videoUrl
    ? { chat_id: channelId, video: videoUrl, caption: text.slice(0, 1024) }
    : { chat_id: channelId, text, disable_web_page_preview: false };
  const body = formatting ? { ...plainBody, parse_mode: formatting.parseMode } : plainBody;
  let result: TelegramResult;
  try {
    result = await request(method, body);
  } catch (error) {
    if (!formatting || !isTelegramParseEntitiesError(error)) throw error;
    // Telegram rejects malformed captions before creating a message. Reusing the
    // same remote URL retries only caption parsing, not an application-side upload.
    result = await request(method, plainBody);
  }
  return String(result?.message_id || "sent");
}
