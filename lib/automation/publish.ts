import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { getPost, updateDelivery } from "./db";
import { sendTelegramPublication, type TelegramFormatting } from "./telegram-client";

const OFFICIAL_CHANNEL_USERNAME = "aionexweb3";
const X_PUBLISHING_ENABLED = false;

function telegramToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  return token;
}

export function telegramChannelId() {
  const channelId = process.env.TELEGRAM_CHANNEL_ID?.trim();
  if (!channelId) throw new Error("TELEGRAM_CHANNEL_ID is not configured.");
  return channelId;
}

function telegramAdminChatId() {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!adminChatId) throw new Error("TELEGRAM_ADMIN_CHAT_ID is not configured.");
  return adminChatId;
}

async function telegramRequest(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${telegramToken()}/${method}`, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as { ok?: boolean; result?: { message_id?: number; id?: number; username?: string; type?: string }; description?: string };
  if (!response.ok || !result.ok) throw new Error(`Telegram ${method}: ${result.description || response.statusText}`);
  return result.result;
}

let verifiedChannel: Promise<string> | undefined;
export function verifyOfficialTelegramChannel() {
  verifiedChannel ??= (async () => {
    const chat = await telegramRequest("getChat", { chat_id: telegramChannelId() });
    if (chat?.type !== "channel" || chat.username?.toLowerCase() !== OFFICIAL_CHANNEL_USERNAME) {
      throw new Error(`TELEGRAM_CHANNEL_ID must resolve to @${OFFICIAL_CHANNEL_USERNAME}.`);
    }
    return String(chat.id);
  })().catch((error) => {
    verifiedChannel = undefined;
    throw error;
  });
  return verifiedChannel;
}

export async function publishTelegram(text: string, videoUrl?: string, formatting?: TelegramFormatting) {
  const channelId = await verifyOfficialTelegramChannel();
  return sendTelegramPublication(telegramRequest, channelId, text, videoUrl, formatting);
}

export async function notifyTelegramAdmin(text: string) {
  const result = await telegramRequest("sendMessage", {
    chat_id: telegramAdminChatId(),
    text: text.slice(0, 4096),
    disable_web_page_preview: true,
  });
  return String(result?.message_id || "sent");
}

export async function publishX(text: string, replyTo?: string) {
  if (!X_PUBLISHING_ENABLED) throw new Error("X publishing is intentionally disabled.");
  const url = "https://api.x.com/2/tweets";
  const consumerKey = process.env.X_CONSUMER_KEY || process.env.X_API_KEY, consumerSecret = process.env.X_CONSUMER_SECRET || process.env.X_SECRET_KEY || process.env.X_API_SECRET, accessToken = process.env.X_ACCESS_TOKEN, accessSecret = process.env.X_ACCESS_TOKEN_SECRET;
  let authorization: string;
  if (consumerKey && consumerSecret && accessToken && accessSecret) {
    const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    const params: Record<string, string> = { oauth_consumer_key: consumerKey, oauth_nonce: randomBytes(16).toString("hex"), oauth_signature_method: "HMAC-SHA1", oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: accessToken, oauth_version: "1.0" };
    const parameterString = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}=${encode(value)}`).join("&");
    params.oauth_signature = createHmac("sha1", `${encode(consumerSecret)}&${encode(accessSecret)}`).update(`POST&${encode(url)}&${encode(parameterString)}`).digest("base64");
    authorization = `OAuth ${Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}="${encode(value)}"`).join(", ")}`;
  } else if (process.env.X_USER_ACCESS_TOKEN) authorization = `Bearer ${process.env.X_USER_ACCESS_TOKEN}`;
  else throw new Error("X user authentication is not configured.");
  let response:Response|undefined; for(let attempt=0;attempt<3;attempt++){response=await fetch(url,{method:"POST",signal:AbortSignal.timeout(15_000),headers:{Authorization:authorization,"Content-Type":"application/json"},body:JSON.stringify(replyTo?{text,reply:{in_reply_to_tweet_id:replyTo}}:{text})});if(response.status!==429&&response.status<500)break;const reset=Number(response.headers.get("x-rate-limit-reset")||0)*1000-Date.now();await new Promise(resolve=>setTimeout(resolve,Math.min(Math.max(reset,1000),10000)));}
  if(!response)throw new Error("X request was not sent.");
  const result = await response.json() as { data?: { id?: string }; detail?: string; title?: string };
  if (!response.ok || !result.data?.id) throw new Error(`X: ${result.detail || result.title || response.statusText}`);
  return result.data.id;
}

export async function publishXThread(parts:string[]){const ids:string[]=[];let reply:string|undefined;for(const part of parts.slice(0,12)){reply=await publishX(part.slice(0,280),reply);ids.push(reply);}return ids;}

export async function publishPost(id: string) {
  const post = await getPost(id);
  if (!post) throw new Error("Post not found.");
  if (post.status === "draft") throw new Error("Approve the post before publishing.");
  const errors: string[] = [];
  let telegramStatus = post.telegramStatus, telegramPostId = post.telegramPostId;
  let xStatus = post.xStatus, xPostId = post.xPostId;
  if (telegramStatus !== "published") try { telegramPostId = await publishTelegram(`${post.title}\n\n${post.socialText}`); telegramStatus = "published"; } catch (error) { telegramStatus = "failed"; errors.push(error instanceof Error ? error.message : "Telegram failed"); }
  if (!X_PUBLISHING_ENABLED) xStatus = "skipped";
  else if (xStatus !== "published") try { xPostId = await publishX(post.socialText); xStatus = "published"; } catch (error) { xStatus = "failed"; errors.push(error instanceof Error ? error.message : "X failed"); }
  // Website publication is independent; failed social deliveries remain retryable.
  const status = "published";
  return updateDelivery(id, { telegramStatus, telegramPostId, xStatus, xPostId, status, error: errors.join(" | ") || null });
}
