import { renderPrivateStoryPreview } from "@/lib/story/render";
import { saveStoryScenario, storySettings } from "@/lib/story/service";
import { visualRepairScenario } from "@/lib/story/visual-repair-scenario";
import { logError } from "@/lib/observability/logger";

export const maxDuration=300;

export async function GET(request:Request){
  if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:"Unauthorized"},{status:401});
  try{
    const settings=await storySettings();
    if(!settings.previewOnly||!settings.dryRun||settings.publishingEnabled)return Response.json({error:"Story preview safety settings are not active."},{status:409});
    const saved=await saveStoryScenario(visualRepairScenario());
    if(!saved.quality.approved)return Response.json({error:"Mandatory visual repair scenario failed content quality validation.",quality:saved.quality},{status:422});
    const preview=await renderPrivateStoryPreview(saved.id,settings.voice);
    return Response.json({ok:true,published:false,scenario:{id:saved.id,title:saved.scenario.title,quality:saved.quality.totalScore,repetition:saved.quality.repetitionRisk},preview},{headers:{"Cache-Control":"no-store"}});
  }catch(error){logError("cron.story-preview",error);return Response.json({ok:false,published:false,error:error instanceof Error?error.message:"Story preview failed."},{status:500});}
}
