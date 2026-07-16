import { templateForCategory } from "./catalog.ts";
import type { StoryScenario } from "./types.ts";

export function visualRepairScenario():StoryScenario{
  const narrations=[
    "Meet the intelligence that evolves with you.",
    "Inside the Telegram Mini App, every valid tap uses energy and helps your AION grow.",
    "As your experience rises, AION unlocks new forms, new power and a stronger identity.",
    "Tasks, daily activity and referrals accelerate your progress.",
    "Open AIONEX. Raise your AION. Shape the future.",
  ];
  const times=[[0,5],[5,17],[17,29],[29,40],[40,50]];
  const visuals=[
    "Futuristic AIONEX laboratory, energy particles, forming logo, animated AION Core and activating eyes.",
    "Telegram Mini App in a phone frame, tapping finger, +1 +2 +5, energy 500 to 497, XP growth and AION reaction.",
    "XP fill, level 1 to 6, AION Core to Spark evolution, expanding rings and mechanical energy detail.",
    "Animated daily task cards, completion checks, expanding referral network, reward badge and celebrating AION.",
    "AION and Telegram Mini App together, OPEN AIONEX button, logo, blue energy outro and @aionexweb3.",
  ];
  const screenText=["AION AWAKENS","TAP | ENERGY | XP","CORE TO SPARK","TASKS | COMMUNITY","OPEN AIONEX"];
  return{
    scenarioKey:`visual-repair-v2-${new Date().toISOString().slice(0,10)}`,
    categoryKey:"ecosystem_overview",
    topic:"AIONEX visual product journey",
    title:"Meet the Intelligence That Evolves With You",
    hook:narrations[0],narration:narrations.join(" "),presenter:"animated_core",durationSeconds:50,
    thumbnailText:"MEET THE INTELLIGENCE THAT EVOLVES WITH YOU",
    telegramCaption:"Meet the intelligence that evolves with you.\n\nOpen AIONEX. Raise your AION. Shape the future.\n\n#AIONEX #AION",
    youtubeTitle:"Meet the Intelligence That Evolves With You | AIONEX",
    youtubeDescription:`${narrations.join(" ")}\n\nEducational product preview.`,
    xCaption:"Meet the intelligence that evolves with you. Open AIONEX. Raise your AION. Shape the future.",
    hashtags:["AIONEX","AION","TelegramMiniApp"],callToAction:narrations[4],
    factualSafetyNotes:["All visuals demonstrate implemented AIONEX concepts without earnings claims.","This is a private visual-quality preview."],
    sourceReferences:["AIONEX repository product implementation"],
    scenes:narrations.map((narration,index)=>({
      position:index+1,purpose:["hook","tap_to_earn","evolution","tasks_community","call_to_action"][index],
      startSeconds:times[index][0],endSeconds:times[index][1],narration,onScreenText:screenText[index],subtitleText:narration,
      backgroundTemplateKey:templateForCategory(index===1?"tap_mining":index===2?"evolution":index===3?"community":"ecosystem_overview"),
      visualInstructions:[visuals[index]],motionInstructions:["Use layered parallax, moving light, particles, and scene-specific transforms.","No static or text-only frames."],assetReferences:[],
    })),
  };
}
