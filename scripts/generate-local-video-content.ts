import {writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {generateDailyVideoContent} from "../lib/content/generate.ts";

const day=process.argv.find(argument=>argument.startsWith("--day="))?.slice(6)||new Date().toISOString().slice(0,10);
const outputArgument=process.argv.find(argument=>argument.startsWith("--output="))?.slice(9);
if(!outputArgument)throw new Error("--output is required.");

const generated=await generateDailyVideoContent(day);
await writeFile(resolve(outputArgument),JSON.stringify(generated,null,2));
