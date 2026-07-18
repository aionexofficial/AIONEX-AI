import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {copyFile,mkdir,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {bundle} from "@remotion/bundler";
import {renderMedia,selectComposition} from "@remotion/renderer";
import {videoContentPackageSchema} from "../lib/content/schema.ts";
import type {GeneratedVideoContent} from "../lib/content/generate.ts";
import {futurePublicationAdapters} from "../lib/platforms/adapters.ts";
import {validateAudibleAudio,type AudioAnalysis} from "../lib/video/audio-validation.ts";
import {validateVideoProbe,type VideoProbe} from "../lib/video/validation.ts";

function execute(command:string,args:string[]){const result=spawnSync(command,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"]});if(result.status!==0)throw new Error(`${command} failed: ${(result.stderr||result.stdout).slice(-1200)}`);return result.stdout;}
function inspect(command:string,args:string[]){const result=spawnSync(command,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"]});if(result.status!==0)throw new Error(`${command} failed: ${(result.stderr||result.stdout).slice(-1200)}`);return `${result.stdout}\n${result.stderr}`;}
function audioAnalysis(log:string,duration:number):AudioAnalysis{const number=(pattern:RegExp)=>{const match=log.match(pattern),value=match?.[1]?.toLowerCase();return !value||value==="-inf"?Number.NEGATIVE_INFINITY:Number(value);},silenceDuration=[...log.matchAll(/silence_duration:\s*([\d.]+)/g)].reduce((total,match)=>total+Number(match[1]),0);return{duration,meanVolumeDb:number(/mean_volume:\s*(-inf|-?[\d.]+)\s*dB/i),maxVolumeDb:number(/max_volume:\s*(-inf|-?[\d.]+)\s*dB/i),silenceDuration:Number(silenceDuration.toFixed(3)),audibleDuration:Number(Math.max(0,duration-silenceDuration).toFixed(3))};}
const day=process.argv.find(argument=>argument.startsWith("--day="))?.slice(6)||new Date().toISOString().slice(0,10);
const contentArgument=process.argv.find(argument=>argument.startsWith("--content-file="))?.slice(15);
const reuseSource=process.argv.includes("--reuse-source");
if(process.argv.includes("--publish"))throw new Error("Public publishing is disabled in the local dry-run pipeline.");
const outputDirectory=resolve("artifacts","local-pipeline",day),generatedContentPath=resolve(outputDirectory,"generated-content.json"),narrationTextPath=resolve(outputDirectory,"narration.txt"),narrationPath=resolve(outputDirectory,"narration.mp3"),narrationMetadataPath=resolve(outputDirectory,"narration.json"),sourceVideo=resolve(outputDirectory,"aionex-daily-source.mp4"),validatedVideo=resolve(outputDirectory,"aionex-daily-validated.mp4"),finalVideo=resolve(outputDirectory,"aionex-daily.mp4"),metadataPath=resolve(outputDirectory,"metadata.json");
await mkdir(outputDirectory,{recursive:true});

if(!contentArgument)execute(process.execPath,["--conditions=react-server","--experimental-strip-types",resolve("scripts","generate-local-video-content.ts"),`--day=${day}`,`--output=${generatedContentPath}`]);
const generated=JSON.parse(await readFile(contentArgument?resolve(contentArgument):generatedContentPath,"utf8")) as GeneratedVideoContent;
generated.content=videoContentPackageSchema.parse(generated.content);
if(reuseSource){if(!existsSync(sourceVideo))throw new Error("--reuse-source requires an existing Remotion source video.");}
else{const serveUrl=await bundle({entryPoint:resolve("remotion","index.ts")}),composition=await selectComposition({serveUrl,id:"AionexDaily",inputProps:generated.content});await renderMedia({serveUrl,composition,codec:"h264",pixelFormat:"yuv420p",outputLocation:sourceVideo,inputProps:generated.content,overwrite:true});}

await writeFile(narrationTextPath,generated.content.script);
execute(process.execPath,["--env-file-if-exists=.env.local","--conditions=react-server","--experimental-strip-types",resolve("scripts","generate-video-narration.ts"),`--input=${narrationTextPath}`,`--output=${narrationPath}`,`--metadata=${narrationMetadataPath}`]);
const narrationMetadata=JSON.parse(await readFile(narrationMetadataPath,"utf8")) as {provider:string;model:string;voice:string;warnings:string[];bytes:number;generatedAt:string};
const rawNarrationDuration=Number(execute("ffprobe",["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",narrationPath]).trim());
if(!Number.isFinite(rawNarrationDuration)||rawNarrationDuration<3)throw new Error(`Generated narration is missing or too short (${rawNarrationDuration||0} seconds).`);
const tempo=rawNarrationDuration>28.25?rawNarrationDuration/28.25:1,filter=`[1:a]${tempo>1?`atempo=${tempo.toFixed(6)},`:""}adelay=500:all=1,apad=whole_dur=30,atrim=0:30,loudnorm=I=-16:TP=-1.5:LRA=11[narration]`;
execute("ffmpeg",["-y","-i",sourceVideo,"-i",narrationPath,"-filter_complex",filter,"-map","0:v:0","-map","[narration]","-t","30","-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-movflags","+faststart",validatedVideo]);
const probe=JSON.parse(execute("ffprobe",["-v","error","-show_streams","-show_format","-of","json",validatedVideo])) as VideoProbe,duration=Number(probe.format?.duration||0),levels=audioAnalysis(inspect("ffmpeg",["-hide_banner","-i",validatedVideo,"-af","silencedetect=noise=-45dB:d=0.5,volumedetect","-f","null","NUL"]),duration),audio=validateAudibleAudio(levels),validation=validateVideoProbe(probe,existsSync(validatedVideo),audio);
if(!validation.passed)throw new Error(`Production video validation failed: ${validation.errors.join(" ")}`);
await copyFile(validatedVideo,finalVideo);

const telegram={status:"prepared-not-published",channel:"https://t.me/aionexweb3",caption:generated.content.telegramCaption,formatting:"plain_text"},youtube={status:"prepared-not-published",title:generated.content.title,description:generated.content.youtubeDescription,tags:generated.content.hashtags.map(tag=>tag.slice(1)),visibility:process.env.YOUTUBE_VISIBILITY||"private",verticalShort:true},future={x:futurePublicationAdapters.x.prepare({title:generated.content.title}),tiktok:futurePublicationAdapters.tiktok.prepare({title:generated.content.title})};
const narration={...narrationMetadata,sourceDurationSeconds:Number(rawNarrationDuration.toFixed(3)),timelineDurationSeconds:30,startSeconds:.5,endSeconds:Number(Math.min(30,.5+rawNarrationDuration/tempo).toFixed(3)),tempo:Number(tempo.toFixed(4)),normalization:{integratedLoudnessTargetLufs:-16,truePeakTargetDb:-1.5},analysis:levels};
const report={dryRun:true,publishingEnabled:false,day,provider:generated.provider,fallback:generated.fallback,warnings:generated.warnings,generatedAt:new Date().toISOString(),content:generated.content,narration,files:{sourceVideo,narration:narrationPath,finalVideo,metadata:metadataPath},validation,telegram,youtube,future};
await Promise.all([writeFile(metadataPath,JSON.stringify(report,null,2)),writeFile(resolve(outputDirectory,"telegram-preview.json"),JSON.stringify(telegram,null,2)),writeFile(resolve(outputDirectory,"youtube-upload.json"),JSON.stringify(youtube,null,2))]);
console.log(JSON.stringify(report,null,2));
