import type {VideoContentPackage} from "./schema.ts";

export type ContentGenerationRequest={day:string;topic?:string;recentTitles?:string[]};
export type ContentProviderName="ollama"|"openai";
export interface ContentGenerationProvider{
  readonly name:ContentProviderName;
  generate(request:ContentGenerationRequest):Promise<VideoContentPackage>;
}
