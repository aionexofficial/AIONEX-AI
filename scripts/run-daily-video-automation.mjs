import {spawnSync} from "node:child_process";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const day=new Date().toISOString().slice(0,10),directory=resolve("artifacts","local-pipeline",day),logPath=resolve(directory,"daily-automation-log.json");
await mkdir(directory,{recursive:true});
const steps=[];
function run(name,command,args){const startedAt=new Date().toISOString(),result=spawnSync(command,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"],env:{...process.env,AIONEX_CONTENT_PROVIDER:process.env.AIONEX_CONTENT_PROVIDER||"ollama"}}),entry={name,startedAt,finishedAt:new Date().toISOString(),exitCode:result.status,stdout:String(result.stdout||"").slice(-12_000),stderr:String(result.stderr||"").slice(-4_000)};steps.push(entry);if(result.status!==0)throw new Error(`${name} failed: ${(entry.stderr||entry.stdout).slice(-1200)}`);return entry;}
let ok=false,error;
try{run("narrated_pipeline","npm.cmd",["run","pipeline:dry-run","--",`--day=${day}`]);run("telegram_publish",process.execPath,["--env-file-if-exists=.env.local",resolve("scripts","publish-daily-telegram-video.mjs"),`--day=${day}`]);ok=true;}catch(caught){error=caught instanceof Error?caught.message:String(caught);}
await writeFile(logPath,JSON.stringify({ok,day,startedBy:"windows-task-scheduler",publishing:{telegram:true,youtube:false,x:false,tiktok:false},steps,error:error||null,finishedAt:new Date().toISOString()},null,2));
if(error)throw new Error(error);
