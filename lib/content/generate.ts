import "server-only";

import {fallbackVideoContent,type VideoContentPackage} from "./schema.ts";
import type {ContentGenerationProvider,ContentProviderName} from "./provider.ts";
import {OllamaContentProvider} from "./ollama-provider.ts";
import {OpenAIContentProvider} from "./openai-provider.ts";

export type GeneratedVideoContent={content:VideoContentPackage;provider:ContentProviderName|"fallback";fallback:boolean;warnings:string[]};

function provider():ContentGenerationProvider{
  const selected=(process.env.AIONEX_CONTENT_PROVIDER||"ollama").toLowerCase();
  if(selected==="openai"){
    if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is required when AIONEX_CONTENT_PROVIDER=openai.");
    return new OpenAIContentProvider(process.env.OPENAI_API_KEY,process.env.OPENAI_AUTOMATION_MODEL||process.env.OPENAI_MODEL||"gpt-5-mini");
  }
  if(selected!=="ollama")throw new Error(`Unsupported AIONEX_CONTENT_PROVIDER: ${selected}`);
  return new OllamaContentProvider();
}

export async function generateDailyVideoContent(day=new Date().toISOString().slice(0,10)):Promise<GeneratedVideoContent>{
  let selected:ContentGenerationProvider;
  try{selected=provider();return{content:await selected.generate({day}),provider:selected.name,fallback:false,warnings:[]};}
  catch(error){const warning=error instanceof Error?error.message:"Content generation failed.";return{content:fallbackVideoContent(day),provider:"fallback",fallback:true,warnings:[warning]};}
}
