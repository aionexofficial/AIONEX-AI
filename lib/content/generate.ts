import "server-only";

import {fallbackVideoContent,type VideoContentPackage} from "./schema.ts";
import type {ContentGenerationProvider,ContentProviderName} from "./provider.ts";
import {OllamaContentProvider} from "./ollama-provider.ts";

export type GeneratedVideoContent={content:VideoContentPackage;provider:ContentProviderName|"fallback";fallback:boolean;warnings:string[]};

function provider():ContentGenerationProvider{
  const selected=(process.env.AIONEX_CONTENT_PROVIDER||"ollama").toLowerCase();
  if(selected!=="ollama")throw new Error(`Unsupported AIONEX_CONTENT_PROVIDER: ${selected}`);
  return new OllamaContentProvider();
}

export async function generateDailyVideoContent(day=new Date().toISOString().slice(0,10),recentTitles:string[]=[]):Promise<GeneratedVideoContent>{
  let selected:ContentGenerationProvider;
  try{selected=provider();return{content:await selected.generate({day,recentTitles}),provider:selected.name,fallback:false,warnings:[]};}
  catch(error){const warning=error instanceof Error?error.message:"Content generation failed.";return{content:fallbackVideoContent(day),provider:"fallback",fallback:true,warnings:[warning]};}
}
