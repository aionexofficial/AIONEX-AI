import { createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { buildStoryComposition, compositionManifest, STORY_COMPOSITION_ID } from "../lib/story/composition.ts";
import { visualRepairScenario } from "../lib/story/visual-repair-scenario.ts";

const required=["AUTH_SECRET","CREATOMATE_API_KEY","DATABASE_URL","NEXT_PUBLIC_SITE_URL","OPENAI_API_KEY"] as const;
for(const name of required)if(!process.env[name])throw new Error(`${name} is required.`);

const scenario=visualRepairScenario(),outputDirectory=resolve("artifacts/story-engine"),videoPath=resolve(outputDirectory,"visual-story-preview.mp4"),metadataPath=resolve(outputDirectory,"private-preview.json");
const sql=neon(process.env.DATABASE_URL!);
let narrationId:string|undefined;

async function createNarration(){
  const response=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",signal:AbortSignal.timeout(90000),headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",voice:"alloy",instructions:"Speak as AION: professional, calm, confident, trustworthy, and clear. Pronounce AIONEX as eye-on-ex and AION as eye-on.",input:scenario.narration,response_format:"mp3"})});
  if(!response.ok)throw new Error(`OpenAI narration failed (${response.status}): ${(await response.text()).slice(0,250)}`);
  const expires=Date.now()+15*60*1000,audio=Buffer.from(await response.arrayBuffer()),rows=await sql`INSERT INTO media_assets(kind,mime_type,data,metadata) VALUES('narration','audio/mpeg',${audio},${JSON.stringify({expiresAt:new Date(expires).toISOString()})}::jsonb) RETURNING id`;
  narrationId=String(rows[0].id);
  const signature=createHmac("sha256",process.env.AUTH_SECRET!).update(`${narrationId}.${expires}`).digest("base64url");
  return `${process.env.NEXT_PUBLIC_SITE_URL!.replace(/\/$/,"")}/api/automation/audio/${narrationId}?expires=${expires}&signature=${encodeURIComponent(signature)}`;
}

type Render={id?:string;status?:string;url?:string;snapshot_url?:string;template_id?:string|null;file_size?:number;width?:number;height?:number;duration?:number;render_scale?:number;error_message?:string};
async function render(composition:ReturnType<typeof buildStoryComposition>){
  const response=await fetch("https://api.creatomate.com/v2/renders",{method:"POST",signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${process.env.CREATOMATE_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(composition)}),body=await response.json() as Render[]|Render;
  if(!response.ok)throw new Error(`Creatomate rejected preview (${response.status}): ${JSON.stringify(body).slice(0,500)}`);
  let job=Array.isArray(body)?body[0]:body;
  if(!job?.id)throw new Error("Creatomate returned no render ID.");
  for(let attempt=0;attempt<60&&job.status!=="succeeded";attempt++){
    if(job.status==="failed")throw new Error(job.error_message||"Creatomate render failed.");
    await new Promise(resolvePromise=>setTimeout(resolvePromise,5000));
    const poll=await fetch(`https://api.creatomate.com/v2/renders/${job.id}`,{signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${process.env.CREATOMATE_API_KEY}`}});
    if(!poll.ok)throw new Error(`Creatomate polling failed (${poll.status}).`);
    job=await poll.json() as Render;
  }
  if(job.status!=="succeeded"||!job.url)throw new Error("Creatomate preview timed out.");
  return job as Required<Pick<Render,"id"|"url">>&Render;
}

try{
  await mkdir(outputDirectory,{recursive:true});
  const audioUrl=await createNarration(),audioCheck=await fetch(audioUrl,{method:"HEAD",signal:AbortSignal.timeout(20000)});
  if(!audioCheck.ok)throw new Error(`Signed narration URL is unavailable (${audioCheck.status}).`);
  const composition=buildStoryComposition(scenario,audioUrl),manifest=compositionManifest(composition),job=await render(composition),video=await fetch(job.url,{signal:AbortSignal.timeout(120000)});
  if(!video.ok)throw new Error(`Rendered MP4 download failed (${video.status}).`);
  const bytes=Buffer.from(await video.arrayBuffer()),errors:string[]=[],warnings:string[]=[];
  if(job.width&&job.height&&Math.abs(job.width/job.height-9/16)>.001)errors.push(`Unexpected aspect ratio ${job.width}x${job.height}.`);
  if(job.width&&job.width<270)errors.push(`Preview width ${job.width} is below the provider's minimum draft resolution.`);
  if(job.height&&job.height<480)errors.push(`Preview height ${job.height} is below the provider's minimum draft resolution.`);
  if(job.width!==1080||job.height!==1920)warnings.push(`Creatomate enforced render scale ${job.render_scale??"unknown"}; production output still requires 1080x1920.`);
  if(job.duration&&Math.abs(job.duration-scenario.durationSeconds)>1)errors.push(`Unexpected duration ${job.duration}.`);
  if(!video.headers.get("content-type")?.includes("video"))errors.push("Provider URL did not return video content.");
  if(bytes.length<250000)errors.push("Rendered MP4 is unexpectedly small.");
  if(manifest.textRatio>.35||manifest.nonTextCount<100||!manifest.hasAudio||!manifest.hasPresenter||!manifest.hasMiniApp)errors.push("Composition manifest failed the visual quality gate.");
  for(const scene of manifest.scenes)if(scene.nonTextCount<15||scene.animatedCount<10||!scene.hasEnvironment||!scene.hasPresenter||!scene.hasBranding)errors.push(`Scene ${scene.position} failed the visual quality gate.`);
  await writeFile(videoPath,bytes);
  const artifact={scenarioKey:scenario.scenarioKey,title:scenario.title,provider:"creatomate",providerJobId:job.id,videoUrl:job.url,snapshotUrl:job.snapshot_url||null,localMp4:"artifacts/story-engine/visual-story-preview.mp4",published:false,validation:{passed:errors.length===0,productionReady:job.width===1080&&job.height===1920,errors,warnings,requestedWidth:1080,requestedHeight:1920,width:job.width||1080,height:job.height||1920,renderScale:job.render_scale??null,aspectRatio:"9:16",durationSeconds:job.duration||scenario.durationSeconds,fileSize:job.file_size||bytes.length,compositionId:STORY_COMPOSITION_ID,manifest}};
  await writeFile(metadataPath,`${JSON.stringify(artifact,null,2)}\n`);
  if(errors.length)throw new Error(`Preview validation failed: ${errors.join(" ")}`);
  console.log(JSON.stringify({providerJobId:job.id,videoUrl:job.url,snapshotUrl:job.snapshot_url||null,videoPath,metadataPath,fileSize:bytes.length,manifest},null,2));
}finally{
  if(narrationId)await sql`DELETE FROM media_assets WHERE id=${narrationId}::uuid AND kind='narration'`.catch(()=>undefined);
}
