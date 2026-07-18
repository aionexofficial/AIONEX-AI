import "server-only";

import { neon } from "@neondatabase/serverless";
import { deleteNarration, storeNarration } from "@/lib/automation/audio-assets";
import { creatomateRequest } from "@/lib/automation/creatomate";
import { isCreatomateManualFailure } from "@/lib/automation/failures";
import { buildStoryComposition, compositionManifest, STORY_COMPOSITION_ID } from "./composition";
import type { StoryScenario } from "./types";

type RenderResult={id:string;url:string;snapshotUrl?:string;templateId:string|null;fileSize?:number;width?:number;height?:number;duration?:number;renderScale?:number};
type Manifest=ReturnType<typeof compositionManifest>;

const database=()=>{if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured.");return neon(process.env.DATABASE_URL);};
function assertLegacyStoryRenderingDisabled():void{throw new Error("Legacy Creatomate story rendering is disabled.");}

async function narration(text:string,voice:string){
  if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is required for Story Engine narration.");
  const response=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",signal:AbortSignal.timeout(90000),headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||"gpt-4o-mini-tts",voice,instructions:"Speak as AION: professional, calm, confident, trustworthy, and clear. Pronounce AIONEX as eye-on-ex, AION as eye-on, AXP as A-X-P, and Web3 as web three.",input:text,response_format:"mp3"})});
  if(!response.ok)throw new Error(`OpenAI narration failed (${response.status}): ${(await response.text()).slice(0,250)}`);
  return Buffer.from(await response.arrayBuffer());
}

async function createRender(scenario:StoryScenario,audioUrl:string):Promise<RenderResult>{
  if(!process.env.CREATOMATE_API_KEY)throw new Error("CREATOMATE_API_KEY is required for Story Engine rendering.");
  const composition=buildStoryComposition(scenario,audioUrl);
  const response=await creatomateRequest("/v2/renders",{method:"POST",signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${process.env.CREATOMATE_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(composition)});
  type Job={id?:string;status?:string;url?:string;snapshot_url?:string;template_id?:string|null;file_size?:number;width?:number;height?:number;duration?:number;render_scale?:number;error_message?:string};
  const body=await response.json() as Job[]|Job;
  let job=Array.isArray(body)?body[0]:body;
  if(!job?.id)throw new Error("Creatomate returned no Story Engine render ID.");
  for(let attempt=0;attempt<60&&job.status!=="succeeded";attempt++){
    if(job.status==="failed")throw new Error(job.error_message||"Creatomate Story Engine render failed.");
    await new Promise(resolve=>setTimeout(resolve,5000));
    const poll=await creatomateRequest(`/v2/renders/${job.id}`,{headers:{Authorization:`Bearer ${process.env.CREATOMATE_API_KEY}`},signal:AbortSignal.timeout(20000)},{checkCircuit:false});
    job=await poll.json() as Job;
  }
  if(job.status!=="succeeded"||!job.url)throw new Error("Creatomate Story Engine render timed out.");
  return{id:String(job.id),url:job.url,snapshotUrl:job.snapshot_url,templateId:job.template_id??null,fileSize:job.file_size,width:job.width,height:job.height,duration:job.duration,renderScale:job.render_scale};
}

export async function validateStoryOutput(input:{url:string;scenario:StoryScenario;width:number;height:number;manifest:Manifest;render:RenderResult;allowDraftScale?:boolean}){
  const errors:string[]=[],warnings:string[]=[],actualWidth=input.render.width||input.width,actualHeight=input.render.height||input.height,productionReady=actualWidth===1080&&actualHeight===1920,correctAspect=Math.abs(actualWidth/actualHeight-9/16)<.001;
  if(input.width!==1080||input.height!==1920)errors.push("Output must be 1080x1920 (9:16).");
  if(input.scenario.durationSeconds<30||input.scenario.durationSeconds>60)errors.push("Duration must be between 30 and 60 seconds.");
  if(input.manifest.compositionId!==STORY_COMPOSITION_ID)errors.push("Deprecated or unknown render composition.");
  if(!input.manifest.hasAudio)errors.push("Audio layer is missing from the render composition.");
  if(!input.manifest.hasPresenter)errors.push("Animated AION presenter layer is missing.");
  if(!input.manifest.hasMiniApp)errors.push("Telegram Mini App phone layer is missing.");
  if(input.manifest.textRatio>.35)errors.push("Composition is dominated by text layers.");
  if(input.manifest.nonTextCount<100)errors.push("Composition has too few non-text visual layers.");
  for(const scene of input.manifest.scenes){
    if(scene.nonTextCount<15)errors.push(`Scene ${scene.position} has too few visual layers.`);
    if(scene.animatedCount<10)errors.push(`Scene ${scene.position} has too little motion.`);
    if(!scene.hasEnvironment)errors.push(`Scene ${scene.position} has no environment layer.`);
    if(!scene.hasPresenter)errors.push(`Scene ${scene.position} has no animated AION presenter.`);
    if(!scene.hasBranding)errors.push(`Scene ${scene.position} has no AIONEX branding.`);
  }
  if(input.scenario.scenes.some(scene=>!scene.subtitleText.trim()))errors.push("Subtitles are missing.");
  if(!correctAspect)errors.push("Provider reported an unexpected aspect ratio.");
  if(!productionReady){
    if(input.allowDraftScale&&correctAspect&&actualWidth>=270&&actualHeight>=480)warnings.push(`Private preview is provider-limited to ${actualWidth}x${actualHeight} at render scale ${input.render.renderScale??"unknown"}; public delivery remains blocked.`);
    else errors.push("Provider output is below the required 1080x1920 production resolution.");
  }
  if(input.render.duration&&Math.abs(input.render.duration-input.scenario.durationSeconds)>1)errors.push("Provider reported an unexpected duration.");
  try{
    const response=await fetch(input.url,{method:"HEAD",signal:AbortSignal.timeout(20000)}),type=response.headers.get("content-type")||"",length=Number(response.headers.get("content-length")||input.render.fileSize||0);
    if(!response.ok||!type.includes("video"))errors.push("Rendered video URL is unavailable or unsupported.");
    if(length>0&&length<250000)errors.push("Rendered video appears corrupted, empty, or text-only.");
  }catch{errors.push("Rendered video URL could not be validated.");}
  return{passed:errors.length===0,productionReady,errors,warnings,requestedWidth:input.width,requestedHeight:input.height,width:actualWidth,height:actualHeight,renderScale:input.render.renderScale??null,aspectRatio:"9:16",duration:input.scenario.durationSeconds,compositionId:STORY_COMPOSITION_ID,providerTemplateId:input.render.templateId,snapshotUrl:input.render.snapshotUrl||null,fileSize:input.render.fileSize||null,manifest:input.manifest};
}

export async function renderPrivateStoryPreview(scenarioId:string,voice="alloy"){
  assertLegacyStoryRenderingDisabled();
  /* c8 ignore start -- retained only for historical preview records; no trigger can execute it. */
  const sql=database(),scenarioRows=await sql`SELECT * FROM story_scenarios WHERE id=${scenarioId}::uuid AND status='approved' LIMIT 1`;
  if(!scenarioRows[0])throw new Error("Approved Story Engine scenario not found.");
  const sceneRows=await sql`SELECT * FROM story_scenes WHERE scenario_id=${scenarioId}::uuid ORDER BY position`,row=scenarioRows[0];
  const scenario:StoryScenario={scenarioKey:String(row.scenario_key),categoryKey:String(row.category_key),topic:String(row.topic),title:String(row.title),hook:String(row.hook),narration:String(row.narration),presenter:String(row.presenter) as StoryScenario["presenter"],durationSeconds:Number(row.duration_seconds),thumbnailText:String(row.thumbnail_text),telegramCaption:String(row.telegram_caption),youtubeTitle:String(row.youtube_title),youtubeDescription:String(row.youtube_description),xCaption:String(row.x_caption),hashtags:Array.isArray(row.hashtags)?row.hashtags.map(String):[],callToAction:String(row.call_to_action),factualSafetyNotes:Array.isArray(row.factual_safety_notes)?row.factual_safety_notes.map(String):[],sourceReferences:Array.isArray(row.source_references)?row.source_references.map(String):[],scenes:sceneRows.map(scene=>({position:Number(scene.position),purpose:String(scene.purpose),startSeconds:Number(scene.start_seconds),endSeconds:Number(scene.end_seconds),narration:String(scene.narration),onScreenText:String(scene.on_screen_text),subtitleText:String(scene.subtitle_text),backgroundTemplateKey:String(scene.background_template_key),visualInstructions:Array.isArray(scene.visual_instructions)?scene.visual_instructions.map(String):[],motionInstructions:Array.isArray(scene.motion_instructions)?scene.motion_instructions.map(String):[],assetReferences:Array.isArray(scene.asset_references)?scene.asset_references.map(String):[]}))};
  const key=`story-preview:${STORY_COMPOSITION_ID}:${scenarioId}:${createKey(scenario)}`,existing=await sql`SELECT * FROM story_render_jobs WHERE idempotency_key=${key} LIMIT 1`;
  if(existing[0]?.status==="ready")return{job:existing[0],skipped:true,reason:"Already rendered"};
  const jobs=await sql`INSERT INTO story_render_jobs(scenario_id,idempotency_key,presenter,status,attempts) VALUES(${scenarioId}::uuid,${key},${scenario.presenter},'narrating',1) ON CONFLICT(idempotency_key) DO UPDATE SET attempts=story_render_jobs.attempts+1,status='narrating',last_error=NULL,updated_at=NOW() RETURNING *`,jobId=String(jobs[0].id);
  let assetId:string|undefined;
  try{
    const audio=await narration(scenario.narration,voice),asset=await storeNarration(audio);assetId=asset.id;
    await sql`UPDATE story_render_jobs SET status='rendering',audio_asset_id=${asset.id}::uuid,updated_at=NOW() WHERE id=${jobId}::uuid`;
    const composition=buildStoryComposition(scenario,asset.url),manifest=compositionManifest(composition),render=await createRender(scenario,asset.url);
    await sql`UPDATE story_render_jobs SET provider_job_id=${render.id},video_url=${render.url},status='validating',updated_at=NOW() WHERE id=${jobId}::uuid`;
    const validation=await validateStoryOutput({url:render.url,scenario,width:1080,height:1920,manifest,render,allowDraftScale:true});
    if(!validation.passed)throw new Error(`Story output validation failed: ${validation.errors.join(" ")}`);
    const done=await sql`UPDATE story_render_jobs SET status='ready',duration_seconds=${scenario.durationSeconds},width=${validation.width},height=${validation.height},has_audio=TRUE,has_subtitles=TRUE,validation=${JSON.stringify(validation)}::jsonb,completed_at=NOW(),updated_at=NOW() WHERE id=${jobId}::uuid RETURNING *`;
    await sql`UPDATE story_scenarios SET status='previewed',updated_at=NOW() WHERE id=${scenarioId}::uuid`;
    await sql`INSERT INTO story_deliveries(scenario_id,platform,status,external_id,external_url,attempts,updated_at) VALUES(${scenarioId}::uuid,'preview','skipped',${render.id},${render.url},1,NOW()) ON CONFLICT(scenario_id,platform) DO UPDATE SET status='skipped',external_id=EXCLUDED.external_id,external_url=EXCLUDED.external_url,attempts=story_deliveries.attempts+1,last_error=NULL,updated_at=NOW()`;
    return{job:done[0],validation,skipped:false};
  }catch(error){const message=error instanceof Error?error.message:"Story render failed",status=isCreatomateManualFailure(error)?"awaiting_billing":"failed";await sql`UPDATE story_render_jobs SET status=${status},last_error=${message.slice(0,2000)},updated_at=NOW() WHERE id=${jobId}::uuid`;throw error;}
  finally{if(assetId)await deleteNarration(assetId).catch(()=>undefined);}
  /* c8 ignore stop */
}

function createKey(scenario:StoryScenario){return Buffer.from(`${scenario.scenarioKey}:${scenario.title}:${scenario.narration.length}`).toString("base64url").slice(0,80);}
