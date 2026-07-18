import "server-only";
import {videoContentPackageSchema,type VideoContentPackage} from "./schema.ts";
import type {ContentGenerationProvider,ContentGenerationRequest} from "./provider.ts";

type OllamaResponse={response?:string;error?:string};
const wait=(milliseconds:number)=>new Promise(resolve=>setTimeout(resolve,milliseconds));

function localEndpoint(){
  const endpoint=new URL(process.env.OLLAMA_BASE_URL||"http://127.0.0.1:11434");
  if(endpoint.protocol!=="http:"||!["127.0.0.1","localhost","[::1]"].includes(endpoint.hostname))throw new Error("OLLAMA_BASE_URL must be a local HTTP loopback address.");
  return endpoint;
}

function parseJson(value:string){
  const cleaned=value.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  return videoContentPackageSchema.parse(JSON.parse(cleaned));
}

export class OllamaContentProvider implements ContentGenerationProvider{
  readonly name="ollama" as const;
  async generate(request:ContentGenerationRequest):Promise<VideoContentPackage>{
    const endpoint=new URL("/api/generate",localEndpoint()),model=process.env.OLLAMA_MODEL||"llama3.2",recent=(request.recentTitles||[]).slice(0,12).join(" | ")||"none";
    const prompt=`You are AIONEX's factual short-form video director. Return concise JSON only. Create one original 30-second vertical video package for ${request.day}. Topic: ${request.topic||"AIONEX AI and Web3 product education"}. Avoid recent titles: ${recent}. Use exactly five visually distinct scenes. Never invent prices, partnerships, releases, returns, or user counts. Repository truth: AIONEX has server-validated taps, energy, AXP, XP, levels, seven AION evolution stages, tasks, referrals, leaderboards, wallet connection, persistent AI conversations, and admin controls. Include AIONEX branding, animated typography directions, AI/Web3 visuals, subtitles, and a final @aionexweb3 call to action. Required JSON keys: concept, script, title, description, telegramCaption, youtubeDescription, hashtags, durationSeconds, scenes. durationSeconds is 30. Use 3-8 hashtags beginning with #. scenes is exactly five objects with headline, body, subtitle, visual. Keep every value concise while making script at least 120 characters.`;
    const timeout=Math.max(60_000,Math.min(Number(process.env.OLLAMA_TIMEOUT_MS)||1_800_000,3_600_000));
    let last:unknown;
    for(let attempt=1;attempt<=2;attempt+=1){
      try{
        const response=await fetch(endpoint,{method:"POST",signal:AbortSignal.timeout(timeout),headers:{"Content-Type":"application/json"},body:JSON.stringify({model,prompt,format:"json",stream:false,keep_alive:"30m",options:{temperature:.55,num_predict:600}})});
        const payload=await response.json() as OllamaResponse;
        if(!response.ok||!payload.response)throw new Error(payload.error||`Ollama request failed (${response.status}).`);
        return parseJson(payload.response);
      }catch(error){
        last=error;
        if(attempt<2)await wait(750);
      }
    }
    throw last instanceof Error?last:new Error("Ollama content generation failed.");
  }
}
