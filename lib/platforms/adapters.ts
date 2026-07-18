import type {PublicationPlatform} from "./config.ts";

export type PublicationPreparation={platform:PublicationPlatform;enabled:boolean;status:"prepared"|"disabled";reason?:string;metadata:Record<string,unknown>};
export interface PublicationAdapter{readonly platform:PublicationPlatform;readonly enabled:boolean;prepare(metadata:Record<string,unknown>):PublicationPreparation;}

class DeferredAdapter implements PublicationAdapter{
  readonly enabled=false;
  readonly platform:"x"|"tiktok";
  constructor(platform:"x"|"tiktok"){this.platform=platform;}
  prepare(metadata:Record<string,unknown>):PublicationPreparation{return{platform:this.platform,enabled:false,status:"disabled",reason:`${this.platform} integration is intentionally deferred.`,metadata};}
}

export const futurePublicationAdapters={x:new DeferredAdapter("x"),tiktok:new DeferredAdapter("tiktok")};
