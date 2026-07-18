import "server-only";

import {parseOpenAIJsonText} from "../automation/openai.ts";
import {videoContentPackageSchema,type VideoContentPackage} from "./schema.ts";
import type {ContentGenerationProvider,ContentGenerationRequest} from "./provider.ts";

export class OpenAIContentProvider implements ContentGenerationProvider{
  readonly name="openai" as const;
  private readonly apiKey:string;
  private readonly model:string;
  constructor(apiKey:string,model:string){this.apiKey=apiKey;this.model=model;}
  async generate(request:ContentGenerationRequest):Promise<VideoContentPackage>{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:AbortSignal.timeout(75_000),headers:{Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:this.model,instructions:"Create factual AIONEX short-form content. Return JSON only and never invent prices, partnerships, releases, returns, or user counts.",input:`Create a 30-second, five-scene vertical AIONEX video package for ${request.day}. Topic: ${request.topic||"AIONEX product education"}. Return concept, script, title, description, telegramCaption, youtubeDescription, hashtags, durationSeconds=30, and exactly five scenes containing headline, body, subtitle, visual.`,text:{format:{type:"json_object"}}})});
    if(!response.ok)throw new Error(`OpenAI content generation failed (${response.status}).`);
    const text=parseOpenAIJsonText(await response.json() as Parameters<typeof parseOpenAIJsonText>[0]);
    if(!text)throw new Error("OpenAI returned no video package.");
    return videoContentPackageSchema.parse(JSON.parse(text));
  }
}
