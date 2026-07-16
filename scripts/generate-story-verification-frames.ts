import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildStoryComposition } from "../lib/story/composition.ts";
import { visualRepairScenario } from "../lib/story/visual-repair-scenario.ts";

if(!process.env.CREATOMATE_API_KEY)throw new Error("CREATOMATE_API_KEY is required.");
type Render={id?:string;status?:string;url?:string;width?:number;height?:number;error_message?:string};

async function render(source:Record<string,unknown>){
  const response=await fetch("https://api.creatomate.com/v2/renders",{method:"POST",signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${process.env.CREATOMATE_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(source)}),body=await response.json() as Render[]|Render;
  if(!response.ok)throw new Error(`Creatomate rejected verification frame (${response.status}): ${JSON.stringify(body).slice(0,400)}`);
  let job=Array.isArray(body)?body[0]:body;
  if(!job?.id)throw new Error("Creatomate returned no verification frame ID.");
  for(let attempt=0;attempt<30&&job.status!=="succeeded";attempt++){
    if(job.status==="failed")throw new Error(job.error_message||"Creatomate verification frame failed.");
    await new Promise(resolvePromise=>setTimeout(resolvePromise,2000));
    const poll=await fetch(`https://api.creatomate.com/v2/renders/${job.id}`,{signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${process.env.CREATOMATE_API_KEY}`}});
    if(!poll.ok)throw new Error(`Creatomate verification frame polling failed (${poll.status}).`);
    job=await poll.json() as Render;
  }
  if(job.status!=="succeeded"||!job.url)throw new Error("Creatomate verification frame timed out.");
  return job as Required<Pick<Render,"id"|"url">>&Render;
}

const outputDirectory=resolve("artifacts/story-engine/verification"),composition=buildStoryComposition(visualRepairScenario(),"https://example.test/narration.mp3"),results=[];
await mkdir(outputDirectory,{recursive:true});
for(let position=1;position<=5;position++){
  const prefix=`s${position}.`,elements=composition.elements.filter(element=>element.name.startsWith(prefix)).map(element=>{const copy={...element,time:0,duration:1};delete copy.animations;return copy;}),job=await render({output_format:"jpg",width:1080,height:1920,render_scale:1,background_color:composition.background_color,metadata:JSON.stringify({kind:"story-verification-frame",scene:position}),elements}),response=await fetch(job.url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`Verification frame ${position} download failed (${response.status}).`);
  const path=resolve(outputDirectory,`scene-${position}.jpg`);await writeFile(path,Buffer.from(await response.arrayBuffer()));results.push({position,id:job.id,url:job.url,path,width:job.width,height:job.height});
}
const preview=JSON.parse(await readFile(resolve("artifacts/story-engine/private-preview.json"),"utf8")) as {snapshotUrl?:string};
if(preview.snapshotUrl){const response=await fetch(preview.snapshotUrl,{signal:AbortSignal.timeout(60000)});if(response.ok)await writeFile(resolve(outputDirectory,"actual-video-scene-3.jpg"),Buffer.from(await response.arrayBuffer()));}
console.log(JSON.stringify(results,null,2));
