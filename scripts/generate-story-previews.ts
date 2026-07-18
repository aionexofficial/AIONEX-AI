import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initialStoryPreviews } from "../lib/story/previews.ts";
import { scoreScenario } from "../lib/story/scoring.ts";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const scenarios=initialStoryPreviews().map((scenario,index)=>({...scenario,quality:scoreScenario(scenario,[],78,42),repetitionAgainstEarlier:scoreScenario(scenario,initialStoryPreviews().slice(0,index),78,42).repetitionRisk}));
const output=join(root,"artifacts","story-engine","seven-day-preview.json");
await mkdir(dirname(output),{recursive:true});
await writeFile(output,`${JSON.stringify({generatedAt:new Date().toISOString(),mode:"private-preview-only",published:false,scenarios},null,2)}\n`,"utf8");
console.log(output);
