import {writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {neon} from "@neondatabase/serverless";
import {generateDailyVideoContent} from "../lib/content/generate.ts";

const day=process.argv.find(argument=>argument.startsWith("--day="))?.slice(6)||new Date().toISOString().slice(0,10);
const outputArgument=process.argv.find(argument=>argument.startsWith("--output="))?.slice(9);
if(!outputArgument)throw new Error("--output is required.");

let recentTitles:string[]=[];
if(process.env.DATABASE_URL){
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql`SELECT title FROM generated_content WHERE format IN ('aionex_vertical_short','aionex_local_video') ORDER BY created_at DESC LIMIT 20`;
  recentTitles=rows.map(row=>String(row.title));
}
const generated=await generateDailyVideoContent(day,recentTitles);
if(process.env.AIONEX_REQUIRE_AI_CONTENT==="true"&&generated.fallback)throw new Error(`Unique AI scenario generation failed: ${generated.warnings.join(" ")}`);
await writeFile(resolve(outputArgument),JSON.stringify(generated,null,2));
