import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {bundle} from "@remotion/bundler";
import {renderMedia,selectComposition} from "@remotion/renderer";
import {videoContentPackageSchema} from "../lib/content/schema.ts";
import type {GeneratedVideoContent} from "../lib/content/generate.ts";
import {futurePublicationAdapters} from "../lib/platforms/adapters.ts";
import {validateVideoProbe,type VideoProbe} from "../lib/video/validation.ts";

function execute(command:string,args:string[]){const result=spawnSync(command,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"]});if(result.status!==0)throw new Error(`${command} failed: ${(result.stderr||result.stdout).slice(-1200)}`);return result.stdout;}
const day=process.argv.find(argument=>argument.startsWith("--day="))?.slice(6)||new Date().toISOString().slice(0,10);
const contentArgument=process.argv.find(argument=>argument.startsWith("--content-file="))?.slice(15);
if(process.argv.includes("--publish"))throw new Error("Public publishing is disabled in the local dry-run pipeline.");
const outputDirectory=resolve("artifacts","local-pipeline",day),generatedContentPath=resolve(outputDirectory,"generated-content.json"),sourceVideo=resolve(outputDirectory,"aionex-daily-source.mp4"),finalVideo=resolve(outputDirectory,"aionex-daily.mp4"),metadataPath=resolve(outputDirectory,"metadata.json");
await mkdir(outputDirectory,{recursive:true});

if(!contentArgument)execute(process.execPath,["--conditions=react-server","--experimental-strip-types",resolve("scripts","generate-local-video-content.ts"),`--day=${day}`,`--output=${generatedContentPath}`]);
const generated=JSON.parse(await readFile(contentArgument?resolve(contentArgument):generatedContentPath,"utf8")) as GeneratedVideoContent;
generated.content=videoContentPackageSchema.parse(generated.content);
const serveUrl=await bundle({entryPoint:resolve("remotion","index.ts")});
const composition=await selectComposition({serveUrl,id:"AionexDaily",inputProps:generated.content});
await renderMedia({serveUrl,composition,codec:"h264",pixelFormat:"yuv420p",outputLocation:sourceVideo,inputProps:generated.content,overwrite:true});

execute("ffmpeg",["-y","-i",sourceVideo,"-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=48000","-map","0:v:0","-map","1:a:0","-t","30","-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-movflags","+faststart",finalVideo]);
const probe=JSON.parse(execute("ffprobe",["-v","error","-show_streams","-show_format","-of","json",finalVideo])) as VideoProbe,validation=validateVideoProbe(probe,existsSync(finalVideo));
if(!validation.passed)throw new Error(`Production video validation failed: ${validation.errors.join(" ")}`);

const telegram={status:"prepared-not-published",channel:"https://t.me/aionexweb3",caption:generated.content.telegramCaption,formatting:"plain_text"},youtube={status:"prepared-not-published",title:generated.content.title,description:generated.content.youtubeDescription,tags:generated.content.hashtags.map(tag=>tag.slice(1)),visibility:process.env.YOUTUBE_VISIBILITY||"private",verticalShort:true},future={x:futurePublicationAdapters.x.prepare({title:generated.content.title}),tiktok:futurePublicationAdapters.tiktok.prepare({title:generated.content.title})};
const report={dryRun:true,publishingEnabled:false,day,provider:generated.provider,fallback:generated.fallback,warnings:generated.warnings,generatedAt:new Date().toISOString(),content:generated.content,files:{sourceVideo,finalVideo,metadata:metadataPath},validation,telegram,youtube,future};
await Promise.all([writeFile(metadataPath,JSON.stringify(report,null,2)),writeFile(resolve(outputDirectory,"telegram-preview.json"),JSON.stringify(telegram,null,2)),writeFile(resolve(outputDirectory,"youtube-upload.json"),JSON.stringify(youtube,null,2))]);
console.log(JSON.stringify(report,null,2));
