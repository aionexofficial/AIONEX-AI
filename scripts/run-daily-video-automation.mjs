import {spawnSync} from "node:child_process";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const slot=process.argv.find(argument=>argument.startsWith("--slot="))?.slice(7)||new Date().toISOString().slice(0,13).replace(":","-"),directory=resolve("artifacts","local-pipeline",slot),logPath=resolve(directory,"daily-automation-log.json");
await mkdir(directory,{recursive:true});
const steps=[];
function run(name,command,args){const startedAt=new Date().toISOString(),result=spawnSync(command,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"],env:{...process.env,AIONEX_CONTENT_PROVIDER:process.env.AIONEX_CONTENT_PROVIDER||"ollama",AIONEX_REQUIRE_AI_CONTENT:"true"}}),entry={name,startedAt,finishedAt:new Date().toISOString(),exitCode:result.status,stdout:String(result.stdout||"").slice(-12_000),stderr:String(result.stderr||result.error?.message||"").slice(-4_000)};steps.push(entry);if(result.status!==0)throw new Error(`${name} failed: ${(entry.stderr||entry.stdout||`exit ${result.status}`).slice(-1200)}`);return entry;}
let ok=false,error;
try{run("narrated_pipeline",process.execPath,["--env-file-if-exists=.env.local","--conditions=react-server","--experimental-strip-types",resolve("scripts","run-local-video-dry-run.ts"),`--day=${slot}`]);run("telegram_publish",process.execPath,["--env-file-if-exists=.env.local",resolve("scripts","publish-daily-telegram-video.mjs"),`--day=${slot}`]);run("youtube_publish",process.execPath,["--env-file-if-exists=.env.local",resolve("scripts","publish-daily-youtube-video.mjs"),`--day=${slot}`]);ok=true;}catch(caught){error=caught instanceof Error?caught.message:String(caught);}
await writeFile(logPath,JSON.stringify({ok,slot,startedBy:"windows-task-scheduler",publishing:{telegram:true,youtubeShort:true,youtubeVideo:true,x:false,tiktok:false},steps,error:error||null,finishedAt:new Date().toISOString()},null,2));
if(error)throw new Error(error);
