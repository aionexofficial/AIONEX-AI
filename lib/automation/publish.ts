import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { getPost, updateDelivery } from "./db";

export async function publishTelegram(text: string, videoUrl?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  const method=videoUrl?"sendVideo":"sendMessage"; const body=videoUrl?{chat_id:process.env.TELEGRAM_CHAT_ID||process.env.TELEGRAM_CHANNEL_ID||"@aionexweb3",video:videoUrl,caption:text.slice(0,1024),parse_mode:"Markdown"}:{chat_id:process.env.TELEGRAM_CHAT_ID||process.env.TELEGRAM_CHANNEL_ID||"@aionexweb3",text,parse_mode:"Markdown",disable_web_page_preview:false};
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", signal: AbortSignal.timeout(30_000), headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as { ok?: boolean; result?: { message_id?: number }; description?: string };
  if (!response.ok || !result.ok) throw new Error(`Telegram: ${result.description || response.statusText}`);
  return String(result.result?.message_id || "sent");
}

export async function publishX(text: string, replyTo?: string) {
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
  if (xStatus !== "published") try { xPostId = await publishX(post.socialText); xStatus = "published"; } catch (error) { xStatus = "failed"; errors.push(error instanceof Error ? error.message : "X failed"); }
  // Website publication is independent; failed social deliveries remain retryable.
  const status = "published";
  return updateDelivery(id, { telegramStatus, telegramPostId, xStatus, xPostId, status, error: errors.join(" | ") || null });
}
