import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { parseOpenAIJsonText } from "./openai";
import { isAutomationFailure } from "./failures";

const db = () => { if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured."); return neon(process.env.DATABASE_URL); };
export type JobType = "news.collect" | "market.analyze" | "content.generate" | "post.daily" | "youtube.script" | "hourly.pipeline" | "story.daily";
export const LEGACY_CREATOMATE_JOB_TYPES=new Set<JobType>(["hourly.pipeline","story.daily"]);

function assertActiveJobType(jobType:JobType){if(LEGACY_CREATOMATE_JOB_TYPES.has(jobType))throw new Error(`Legacy Creatomate job ${jobType} is disabled.`);}

export async function enqueue(jobType: JobType, payload: Record<string, unknown> = {}, idempotencyKey?: string, runAt = new Date()) {
  assertActiveJobType(jobType);
  const rows = await db()`INSERT INTO scheduled_jobs(job_type,payload,idempotency_key,run_at) VALUES(${jobType},${JSON.stringify(payload)}::jsonb,${idempotencyKey ?? null},${runAt.toISOString()}) ON CONFLICT(idempotency_key) DO UPDATE SET updated_at=NOW() RETURNING *`;
  return rows[0];
}

async function log(event: string, jobId: string, message?: string, context: Record<string, unknown> = {}) { await db()`INSERT INTO automation_logs(level,event,job_id,message,context) VALUES('info',${event},${jobId}::uuid,${message ?? null},${JSON.stringify(context)}::jsonb)`; }

async function market() {
  const response = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,sui&price_change_percentage=24h", { signal: AbortSignal.timeout(15000), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Market provider returned ${response.status}`);
  const data = await response.json() as Array<{id:string;symbol:string;current_price:number;price_change_percentage_24h:number;market_cap:number}>;
  const summary = data.map(x => `${x.symbol.toUpperCase()}: $${x.current_price.toLocaleString("en-US")} (${Number(x.price_change_percentage_24h).toFixed(2)}% 24h)`).join("; ");
  await db()`INSERT INTO market_reports(report_type,report_date,raw_data,summary) VALUES('daily',CURRENT_DATE,${JSON.stringify(data)}::jsonb,${summary}) ON CONFLICT(report_type,report_date) DO UPDATE SET raw_data=EXCLUDED.raw_data,summary=EXCLUDED.summary,created_at=NOW()`;
  return { assets: data.length };
}

async function content(payload: Record<string, unknown>) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const topic = String(payload.topic || "AI and Web3").slice(0,80), format = String(payload.format || "educational_post").slice(0,40);
  const recent = await db()`SELECT title FROM generated_content ORDER BY created_at DESC LIMIT 50`;
  const response = await fetch("https://api.openai.com/v1/responses", { method:"POST", signal:AbortSignal.timeout(45000), headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"}, body:JSON.stringify({model:process.env.OPENAI_AUTOMATION_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini",instructions:"Write accurate, original AIONEX educational content. Do not invent live facts, prices, partnerships, or returns. Return JSON only.",input:`Create one ${format} about ${topic}. Avoid these recent titles: ${recent.map(r=>String(r.title)).join(" | ")}.`,text:{format:{type:"json_schema",name:"content",strict:true,schema:{type:"object",additionalProperties:false,required:["title","body"],properties:{title:{type:"string"},body:{type:"string"}}}}}}) });
  if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
  const out = await response.json() as {output_text?:string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>};
  const text = parseOpenAIJsonText(out);
  if (!text) throw new Error("OpenAI returned no content.");
  const generated = JSON.parse(text) as {title:string;body:string};
  const hash = createHash("sha256").update(`${topic}\0${format}\0${generated.title}\0${generated.body}`).digest("hex");
  const rows = await db()`INSERT INTO generated_content(content_hash,topic,format,title,body) VALUES(${hash},${topic},${format},${generated.title},${generated.body}) ON CONFLICT(content_hash) DO NOTHING RETURNING id`;
  if (!rows[0]) throw new Error("Generated content duplicates existing content."); return { contentId: rows[0].id };
}

async function execute(type: string, payload: Record<string, unknown>) { if(LEGACY_CREATOMATE_JOB_TYPES.has(type as JobType))throw new Error(`Legacy Creatomate job ${type} is disabled.`);if (type === "market.analyze") return market(); if (type === "content.generate" || type === "youtube.script") return content(payload); if (type === "post.daily") { const { GET } = await import("@/app/api/cron/daily-post/route"); const response = await GET(new Request("http://internal",{headers:{authorization:`Bearer ${process.env.CRON_SECRET}`}})); if (!response.ok) throw new Error(`Daily post failed (${response.status})`); return { published:true }; } throw new Error(`Unsupported job type: ${type}`); }

export async function runWorker(limit = 5) {
  const worker = randomUUID(); const scheduler = await db()`SELECT value FROM automation_settings WHERE key='scheduler'`;
  if (scheduler[0]?.value?.paused === true) return { paused:true, processed:0 };
  const jobs = await db()`UPDATE scheduled_jobs SET status='running',locked_at=NOW(),locked_by=${worker},attempts=attempts+1,updated_at=NOW() WHERE id IN (SELECT id FROM scheduled_jobs WHERE status IN ('queued','retry') AND run_at<=NOW() ORDER BY priority DESC,run_at FOR UPDATE SKIP LOCKED LIMIT ${Math.min(Math.max(limit,1),20)}) RETURNING *`;
  let completed=0, failed=0;
  for (const job of jobs) try { const result=await execute(String(job.job_type), job.payload as Record<string,unknown>); await db()`UPDATE scheduled_jobs SET status='completed',completed_at=NOW(),last_error=NULL,updated_at=NOW(),locked_at=NULL,locked_by=NULL WHERE id=${job.id}`; await log("job.completed",String(job.id),undefined,result); completed++; } catch(error) { const message=error instanceof Error?error.message:"Unknown job failure",failure=isAutomationFailure(error)?error:undefined,manual=failure?.manualRetry===true,retryable=failure?.retryable===true,dead=!manual&&(!retryable||Number(job.attempts)>=Number(job.max_attempts)),delay=Math.min(3600,30*2**Math.max(0,Number(job.attempts)-1)),status=manual?"manual":dead?"dead":"retry"; await db()`UPDATE scheduled_jobs SET status=${status},run_at=CASE WHEN ${status}='retry' THEN NOW()+(${delay}*INTERVAL '1 second') ELSE run_at END,last_error=${message.slice(0,1000)},updated_at=NOW(),locked_at=NULL,locked_by=NULL WHERE id=${job.id}`; await log(manual?"job.manual":dead?"job.dead":"job.retry",String(job.id),message); failed++; }
  return { paused:false, processed:jobs.length, completed, failed };
}

export async function jobState(id: string) {
  const rows = await db()`SELECT id,job_type,status,attempts,last_error,completed_at FROM scheduled_jobs WHERE id=${id}::uuid LIMIT 1`;
  return rows[0] || null;
}

export async function retryJob(id: string) {
  const pending = await db()`SELECT job_type,last_error FROM scheduled_jobs WHERE id=${id}::uuid AND status='manual' LIMIT 1`;
  if (!pending[0]) throw new Error("Manual-retry job not found.");
  if(LEGACY_CREATOMATE_JOB_TYPES.has(String(pending[0].job_type) as JobType)||/Creatomate/i.test(String(pending[0].last_error||"")))throw new Error("Legacy Creatomate retries are disabled.");
  const rows = await db()`UPDATE scheduled_jobs SET status='queued',run_at=NOW(),attempts=0,last_error=NULL,completed_at=NULL,locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE id=${id}::uuid AND status='manual' RETURNING *`;
  if (!rows[0]) throw new Error("Manual-retry job changed before it could be retried.");
  return rows[0];
}

export async function automationStatus() { const [jobs,logs,settings]=await Promise.all([db()`SELECT status,COUNT(*)::int count FROM scheduled_jobs GROUP BY status`,db()`SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT 50`,db()`SELECT value FROM automation_settings WHERE key='scheduler'`]); return {scheduler:settings[0]?.value || {paused:false},queue:Object.fromEntries(jobs.map(x=>[String(x.status),Number(x.count)])),logs}; }
export async function setPaused(paused:boolean) { await db()`INSERT INTO automation_settings(key,value) VALUES('scheduler',${JSON.stringify({paused})}::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`; return {paused}; }
