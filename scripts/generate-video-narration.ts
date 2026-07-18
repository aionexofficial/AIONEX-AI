import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {generateNarration} from "../lib/video/tts.ts";

const argument=(name:string)=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3);
const input=argument("input"),output=argument("output"),metadata=argument("metadata");
if(!input||!output||!metadata)throw new Error("--input, --output, and --metadata are required.");
const narration=await generateNarration(await readFile(resolve(input),"utf8"));
await Promise.all([writeFile(resolve(output),narration.audio),writeFile(resolve(metadata),JSON.stringify({provider:narration.provider,model:narration.model,voice:narration.voice,warnings:narration.warnings,bytes:narration.audio.length,generatedAt:new Date().toISOString()},null,2))]);
