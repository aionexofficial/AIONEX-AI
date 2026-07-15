import { STORY_CATEGORIES } from "./catalog.ts";
import type { StorySettings } from "./types.ts";

export function selectStoryCategory(history:string[],settings:Pick<StorySettings,"preferredCategories"|"blockedCategories"|"categoryWeights">,seed=new Date().toISOString().slice(0,10)){const previous=history[0];const allowed=STORY_CATEGORIES.filter(([key])=>key!==previous&&!settings.blockedCategories.includes(key));if(!allowed.length)throw new Error("No Story Engine categories are available.");const preferred=allowed.filter(([key])=>settings.preferredCategories.includes(key));const pool=preferred.length?preferred:allowed;const scored=pool.map(([key,name],index)=>({key,name,score:(settings.categoryWeights[key]??100)+hash(`${seed}:${key}`)%97-index*.001})).sort((a,b)=>b.score-a.score);return scored[0];}
function hash(value:string){let result=2166136261;for(const character of value){result^=character.charCodeAt(0);result=Math.imul(result,16777619);}return result>>>0;}
