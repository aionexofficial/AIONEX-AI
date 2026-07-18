import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {neon} from "@neondatabase/serverless";

const day=process.argv.find(argument=>argument.startsWith("--day="))?.slice(6)||new Date().toISOString().slice(0,10),directory=resolve("artifacts","local-pipeline",day),videoPath=resolve(directory,"aionex-daily.mp4"),metadataPath=resolve(directory,"metadata.json"),reportPath=resolve(directory,"telegram-automation-report.json");
const required=name=>{const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is not configured.`);return value;};
const video=await readFile(videoPath),metadata=JSON.parse(await readFile(metadataPath,"utf8")),caption=String(metadata.telegram?.caption||"").slice(0,1024);
if(!caption)throw new Error("Prepared Telegram caption is missing.");
if(!metadata.validation?.productionReady||!metadata.validation?.audio?.passed)throw new Error("Daily publishing rejected a missing, silent, or invalid narration track.");
const token=required("TELEGRAM_BOT_TOKEN"),configuredChannel=required("TELEGRAM_CHANNEL_ID"),sql=neon(required("DATABASE_URL"));

async function telegram(method,body){const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,body instanceof FormData?{method:"POST",body}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),payload=await response.json().catch(()=>({}));if(!response.ok||!payload.ok)throw new Error(`Telegram ${method} failed (${response.status}): ${payload.description||response.statusText}`);return payload.result;}

const chat=await telegram("getChat",{chat_id:configuredChannel});
if(chat?.type!=="channel"||String(chat?.username||"").toLowerCase()!=="aionexweb3")throw new Error("Daily publishing stopped: TELEGRAM_CHANNEL_ID is not the official @aionexweb3 channel.");
const contentHash=createHash("sha256").update("aionex-daily-narrated-telegram-v1\0").update(day).update("\0").update(video).update("\0").update(caption).digest("hex"),existing=await sql`SELECT t.message_id FROM generated_content g JOIN telegram_posts t ON t.content_id=g.id AND t.status='published' WHERE g.content_hash=${contentHash} LIMIT 1`;
if(existing[0]?.message_id){const messageId=String(existing[0].message_id),report={ok:true,skipped:true,reason:"duplicate",day,messageId,messageLink:`https://t.me/aionexweb3/${messageId}`,contentHash:contentHash.slice(0,12),youtube:false,x:false,tiktok:false};await writeFile(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exit(0);}
const inserted=await sql`INSERT INTO generated_content(content_hash,topic,format,title,body,metadata) VALUES(${contentHash},'AIONEX daily narrated video','aionex_vertical_short',${String(metadata.content?.title||"AIONEX Daily")},${String(metadata.content?.script||"")},${JSON.stringify({dailyAutomation:true,telegramOnly:true,narrated:true,day,videoSha256:createHash("sha256").update(video).digest("hex")})}::jsonb) ON CONFLICT(content_hash) DO NOTHING RETURNING id`;
if(!inserted[0])throw new Error("Duplicate publication lock exists without a completed Telegram delivery; manual review is required.");
const contentId=String(inserted[0].id),form=new FormData();form.set("chat_id",String(chat.id));form.set("caption",caption);form.set("supports_streaming","true");form.set("video",new Blob([video],{type:"video/mp4"}),"aionex-daily.mp4");
let message;
try{message=await telegram("sendVideo",form);}catch(error){await sql`UPDATE generated_content SET metadata=metadata||${JSON.stringify({telegramError:error instanceof Error?error.message:String(error),stoppedAt:new Date().toISOString()})}::jsonb WHERE id=${contentId}::uuid`;throw error;}
if(!message?.message_id||String(message.chat?.username||"").toLowerCase()!=="aionexweb3"||String(message.caption||"")!==caption)throw new Error("Telegram response verification failed after upload; automatic retry is disabled.");
await sql`INSERT INTO telegram_posts(content_id,message_id,chat_id,status,attempts,published_at) VALUES(${contentId}::uuid,${String(message.message_id)},${String(chat.id)},'published',1,NOW())`;
const report={ok:true,skipped:false,day,messageId:String(message.message_id),messageLink:`https://t.me/aionexweb3/${message.message_id}`,contentHash:contentHash.slice(0,12),audio:metadata.validation.audio.analysis,publishedAt:new Date().toISOString(),youtube:false,x:false,tiktok:false};await writeFile(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
