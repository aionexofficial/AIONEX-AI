import "server-only";

import {generateDailyVideoContent} from "@/lib/content/generate";
import {defaultScenePlan} from "./catalog";
import type {StoryScenario,StorySettings} from "./types";

export async function generateWithLocalProvider(categoryKey:string,day:string,settings:StorySettings):Promise<StoryScenario>{
  const generated=await generateDailyVideoContent(day);
  const plan=defaultScenePlan(settings.durationSeconds,categoryKey);
  return{
    scenarioKey:"pending",categoryKey,topic:generated.content.concept,title:generated.content.title,
    hook:generated.content.scenes[0].headline,narration:generated.content.script,presenter:"animated_core",
    durationSeconds:settings.durationSeconds,thumbnailText:generated.content.scenes[0].headline,
    telegramCaption:generated.content.telegramCaption,youtubeTitle:generated.content.title,
    youtubeDescription:generated.content.youtubeDescription,xCaption:"",hashtags:generated.content.hashtags,
    callToAction:generated.content.scenes[4].body,
    factualSafetyNotes:["Generated from repository-supported AIONEX capabilities; verify time-sensitive claims before publishing."],
    sourceReferences:[`content-provider:${generated.provider}`],
    scenes:generated.content.scenes.map((scene,index)=>({position:index+1,purpose:scene.headline,
      startSeconds:plan[index].startSeconds,endSeconds:plan[index].endSeconds,narration:scene.body,
      onScreenText:scene.headline,subtitleText:scene.subtitle,backgroundTemplateKey:plan[index].backgroundTemplateKey,
      visualInstructions:[scene.visual],motionInstructions:["Layered parallax, particles, animated typography, and a smooth transition."],assetReferences:[]})),
  };
}
