import "server-only";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { parseOpenAIJsonText } from "./openai";
import { publishTelegram, publishXThread } from "./publish";
import { uploadYoutube } from "./youtube";

const database=()=>{if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured.");return neon(process.env.DATABASE_URL)};
const feeds=[
  {source:"CoinDesk",url:"https://www.coindesk.com/arc/outboundfeeds/rss/"},
  {source:"Cointelegraph",url:"https://cointelegraph.com/rss"},
  {source:"Decrypt",url:"https://decrypt.co/feed"},
  {source:"TechCrunch AI",url:"https://techcrunch.com/category/artificial-intelligence/feed/"},
];
type News={source:string;title:string;url:string;publishedAt:string;importance:number};
type Package={title:string;description:string;summary:string;narration:string;tags:string[];thread:string[];subtitles:string[]};
const clean=(value:string)=>value.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').trim();
function items(xml:string,source:string){return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].slice(0,15).map(match=>{const item=match[0],pick=(tag:string)=>clean(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,"i"))?.[1]||"");const title=pick("title"),url=pick("link")||item.match(/<link[^>]+href=["']([^"']+)/i)?.[1]||"",published=pick("pubDate")||pick("published")||pick("dc:date");return{source,title,url,publishedAt:new Date(published||Date.now()).toISOString(),importance:0}}).filter(x=>x.title&&x.url)}
function rank(item:News){const text=item.title.toLowerCase();let score=Math.max(0,24-(Date.now()-new Date(item.publishedAt).getTime())/3600000);for(const word of ["breaking","regulation","sec","hack","exploit","bitcoin","ethereum","openai","launch","approved","billion","record"])if(text.includes(word))score+=8;if(item.source==="CoinDesk"||item.source==="TechCrunch AI")score+=4;return Math.round(score)}
export async function collectNews(){const settled=await Promise.allSettled(feeds.map(async feed=>{const response=await fetch(feed.url,{signal:AbortSignal.timeout(15000),headers:{"User-Agent":"AIONEX-NewsBot/1.0"},cache:"no-store"});if(!response.ok)throw new Error(`${feed.source}: ${response.status}`);return items(await response.text(),feed.source)}));const all=settled.flatMap(x=>x.status==="fulfilled"?x.value:[]),seen=new Set<string>(),unique=all.filter(item=>{const key=item.title.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();if(seen.has(key))return false;seen.add(key);return true}).map(x=>({...x,importance:rank(x)})).sort((a,b)=>b.importance-a.importance);const sql=database();for(const item of unique)await sql`INSERT INTO news_cache(source,source_url,canonical_url,title,raw_data,importance,published_at) VALUES(${item.source},${item.url},${item.url},${item.title},${JSON.stringify(item)}::jsonb,${item.importance},${item.publishedAt}) ON CONFLICT(canonical_url) DO UPDATE SET importance=EXCLUDED.importance,fetched_at=NOW()`;return unique.slice(0,8)}
async function generate(news:News[]):Promise<Package>{if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is not configured.");const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:AbortSignal.timeout(60000),headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_AUTOMATION_MODEL||process.env.OPENAI_MODEL||"gpt-5-mini",instructions:"You are AIONEX's factual AI/Web3 news editor. Synthesize only the supplied headlines, clearly attribute uncertainty, never invent facts or prices, and write original concise copy. Return JSON only.",input:`Create a 45-60 second vertical news video package from:\n${news.map(n=>`[${n.source}] ${n.title} — ${n.url}`).join("\n")}`,text:{format:{type:"json_schema",name:"video_package",strict:true,schema:{type:"object",additionalProperties:false,required:["title","description","summary","narration","tags","thread","subtitles"],properties:{title:{type:"string"},description:{type:"string"},summary:{type:"string"},narration:{type:"string"},tags:{type:"array",items:{type:"string"}},thread:{type:"array",items:{type:"string"}},subtitles:{type:"array",items:{type:"string"}}}}}}})});if(!response.ok)throw new Error(`OpenAI generation failed (${response.status}): ${(await response.text()).slice(0,250)}`);const data=await response.json() as {output_text?:string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>};const text=parseOpenAIJsonText(data);if(!text)throw new Error("OpenAI returned no package.");return JSON.parse(text) as Package}
async function voiceId(){if(process.env.ELEVENLABS_VOICE_ID)return process.env.ELEVENLABS_VOICE_ID;const response=await fetch("https://api.elevenlabs.io/v2/voices?page_size=10",{headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY||""},signal:AbortSignal.timeout(15000)});const data=await response.json() as {voices?:Array<{voice_id:string}>};if(!response.ok||!data.voices?.[0])throw new Error("ELEVENLABS_VOICE_ID is required because no account voice could be selected.");return data.voices[0].voice_id}
async function narrateOpenAI(text:string){if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is not configured for narration fallback.");const response=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",signal:AbortSignal.timeout(90000),headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",voice:process.env.OPENAI_TTS_VOICE||"alloy",input:text,response_format:"mp3"})});if(!response.ok)throw new Error(`OpenAI narration failed (${response.status}): ${(await response.text()).slice(0,250)}`);return Buffer.from(await response.arrayBuffer())}
async function narrate(text:string){if(process.env.ELEVENLABS_API_KEY){try{const id=await voiceId(),response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`,{method:"POST",signal:AbortSignal.timeout(90000),headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({text,model_id:"eleven_multilingual_v2"})});if(response.ok)return Buffer.from(await response.arrayBuffer());}catch{}}return narrateOpenAI(text)}
async function render(pkg:Package,audio:Buffer){if(!process.env.CREATOMATE_API_KEY)throw new Error("CREATOMATE_API_KEY is not configured.");const duration=Math.max(20,Math.min(75,Math.ceil(pkg.narration.split(/\s+/).length/2.5))),segment=duration/Math.max(pkg.subtitles.length,1),logo=`${process.env.NEXT_PUBLIC_SITE_URL}/favicon.ico`;const elements:Record<string,unknown>[]=[{type:"audio",source:`data:audio/mpeg;base64,${audio.toString("base64")}`},{type:"image",source:logo,x:"50%",y:"9%",width:"18%",height:"10%",fit:"contain"},{type:"text",text:"AIONEX AI NEWS",x:"50%",y:"18%",width:"88%",height:"8%",fill_color:"#7CFFB2",font_family:"Arial",font_weight:"700",font_size:"5.2 vmin",x_alignment:"50%",y_alignment:"50%"}];pkg.subtitles.slice(0,10).forEach((text,index)=>elements.push({type:"text",text,time:index*segment,duration:segment,x:"50%",y:"65%",width:"88%",height:"28%",fill_color:"#FFFFFF",stroke_color:"#000000",stroke_width:"0.5 vmin",font_family:"Arial",font_weight:"700",font_size:"6 vmin",x_alignment:"50%",y_alignment:"50%",animations:[{type:"fade",duration:0.25}]}));const response=await fetch("https://api.creatomate.com/v2/renders",{method:"POST",signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${process.env.CREATOMATE_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({output_format:"mp4",width:1080,height:1920,duration,frame_rate:30,background_color:"#070B18",elements})});const created=await response.json() as Array<{id?:string;status?:string;url?:string;error_message?:string}>|{id?:string;status?:string;url?:string;error_message?:string};if(!response.ok)throw new Error(`Creatomate render creation failed (${response.status}).`);let job=Array.isArray(created)?created[0]:created;if(!job?.id)throw new Error("Creatomate returned no render ID.");for(let i=0;i<36&&job.status!=="succeeded";i++){if(job.status==="failed")throw new Error(job.error_message||"Creatomate render failed.");await new Promise(resolve=>setTimeout(resolve,5000));const poll=await fetch(`https://api.creatomate.com/v2/renders/${job.id}`,{headers:{Authorization:`Bearer ${process.env.CREATOMATE_API_KEY}`}});job=await poll.json() as typeof job;}if(job.status!=="succeeded"||!job.url)throw new Error("Creatomate render timed out.");return{id:job.id,url:job.url,duration}}
async function notifyError(message:string){try{await publishTelegram(`⚠️ *AIONEX automation failed*\n${message.slice(0,800)}`)}catch{}}
export async function runHourlyPipeline(runKey=new Date().toISOString().slice(0,13)){
  const sql=database(),existing=await sql`SELECT * FROM pipeline_runs WHERE run_key=${runKey}`;
  if(existing[0]?.status==="completed")return existing[0].result;
  const rows=await sql`INSERT INTO pipeline_runs(run_key) VALUES(${runKey}) ON CONFLICT(run_key) DO UPDATE SET updated_at=NOW() RETURNING id`;
  const runId=String(rows[0].id);
  try{
    const news=await collectNews();
    if(!news.length)throw new Error("No trusted-source news could be collected.");
    await sql`UPDATE pipeline_runs SET stage='script',news_ids=${JSON.stringify(news.map(n=>n.url))}::jsonb,updated_at=NOW() WHERE id=${runId}::uuid`;
    const pkg=await generate(news),hash=createHash("sha256").update(news.map(n=>n.url).sort().join("|")).digest("hex");
    const content=await sql`INSERT INTO generated_content(content_hash,topic,format,title,body,metadata)
      VALUES(${hash},'AI/Web3/Crypto','hourly_video',${pkg.title},${pkg.narration},${JSON.stringify({news,pkg})}::jsonb)
      ON CONFLICT(content_hash) DO UPDATE SET metadata=EXCLUDED.metadata
      WHERE NOT EXISTS(SELECT 1 FROM youtube_uploads y WHERE y.content_id=generated_content.id)
        AND NOT EXISTS(SELECT 1 FROM telegram_posts t WHERE t.content_id=generated_content.id)
        AND NOT EXISTS(SELECT 1 FROM tweets t WHERE t.content_id=generated_content.id)
      RETURNING id`;
    if(!content[0])throw new Error("This news package was already published.");
    const contentId=String(content[0].id);
    await sql`UPDATE pipeline_runs SET content_id=${contentId}::uuid,stage='narration',updated_at=NOW() WHERE id=${runId}::uuid`;
    const audio=await narrate(pkg.narration);
    await sql`UPDATE pipeline_runs SET stage='render',updated_at=NOW() WHERE id=${runId}::uuid`;
    const video=await render(pkg,audio),upload=await sql`INSERT INTO youtube_uploads(content_id,title,description,tags,voice_script,subtitles,render_job,status) VALUES(${contentId}::uuid,${pkg.title.slice(0,100)},${pkg.description},${JSON.stringify(pkg.tags)}::jsonb,${pkg.narration},${pkg.subtitles.join("\n")},${JSON.stringify(video)}::jsonb,'rendered') RETURNING id`;
    const uploadId=String(upload[0].id);
    await sql`INSERT INTO media_assets(upload_id,kind,mime_type,external_url,metadata) VALUES(${uploadId}::uuid,'video','video/mp4',${video.url},${JSON.stringify({creatomateId:video.id})}::jsonb)`;
    await sql`UPDATE pipeline_runs SET youtube_upload_id=${uploadId}::uuid,stage='publish',updated_at=NOW() WHERE id=${runId}::uuid`;
    const yt=await uploadYoutube(uploadId),threadIds=await publishXThread(pkg.thread),telegramId=await publishTelegram(`*${pkg.title}*\n\n${pkg.summary}`,video.url);
    await Promise.all([sql`INSERT INTO tweets(content_id,tweet_id,root_tweet_id,thread_ids,status,published_at) VALUES(${contentId}::uuid,${threadIds.at(-1)||null},${threadIds[0]||null},${JSON.stringify(threadIds)}::jsonb,'published',NOW())`,sql`INSERT INTO telegram_posts(content_id,message_id,chat_id,video_url,status,published_at) VALUES(${contentId}::uuid,${telegramId},${process.env.TELEGRAM_CHAT_ID||null},${video.url},'published',NOW())`]);
    const result={runId,contentId,videoUrl:video.url,youtubeVideoId:yt.videoId,xThreadIds:threadIds,telegramMessageId:telegramId};
    await sql`UPDATE pipeline_runs SET status='completed',stage='completed',result=${JSON.stringify(result)}::jsonb,completed_at=NOW(),last_error=NULL,updated_at=NOW() WHERE id=${runId}::uuid`;
    return result;
  }catch(error){
    const message=error instanceof Error?error.message:"Pipeline failed";
    await sql`UPDATE pipeline_runs SET status='failed',last_error=${message.slice(0,2000)},updated_at=NOW() WHERE id=${runId}::uuid`;
    await notifyError(message);
    throw error;
  }
}
