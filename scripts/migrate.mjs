import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing.");

const sql = neon(databaseUrl);

function splitSql(source){
  const statements=[];let current="",single=false,double=false,lineComment=false,blockComment=false,dollar=null;
  for(let index=0;index<source.length;index+=1){const char=source[index],next=source[index+1];
    if(lineComment){current+=char;if(char==="\n")lineComment=false;continue;}
    if(blockComment){current+=char;if(char==="*"&&next==="/"){current+=next;index+=1;blockComment=false;}continue;}
    if(dollar){if(source.startsWith(dollar,index)){current+=dollar;index+=dollar.length-1;dollar=null;}else current+=char;continue;}
    if(!single&&!double&&char==="-"&&next==="-"){current+=char+next;index+=1;lineComment=true;continue;}
    if(!single&&!double&&char==="/"&&next==="*"){current+=char+next;index+=1;blockComment=true;continue;}
    if(!single&&!double&&char==="$"){const match=source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);if(match){dollar=match[0];current+=dollar;index+=dollar.length-1;continue;}}
    if(char==="'"&&!double){current+=char;if(single&&next==="'"){current+=next;index+=1;}else single=!single;continue;}
    if(char==='"'&&!single){current+=char;if(double&&next==='"'){current+=next;index+=1;}else double=!double;continue;}
    if(char===";"&&!single&&!double){if(current.trim())statements.push(current.trim());current="";}else current+=char;
  }
  if(current.trim())statements.push(current.trim());if(single||double||dollar||blockComment)throw new Error("Migration contains an unterminated SQL quote or comment.");return statements;
}
await sql`SELECT 1 AS connected`;
await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

const directory = join(process.cwd(), "db", "migrations");
const filenames = (await readdir(directory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
let applied = 0;

for (const filename of filenames) {
  const source = await readFile(join(directory, filename), "utf8");
  const checksum = createHash("sha256").update(source).digest("hex");
  const existing = await sql`SELECT checksum FROM schema_migrations WHERE filename=${filename}`;
  if (existing[0]) {
    if (existing[0].checksum !== checksum) throw new Error(`Applied migration checksum mismatch: ${filename}`);
    console.log(`Verified: ${filename}`);
    continue;
  }

  const body = source.replace(/^\s*BEGIN\s*;/i, "").replace(/COMMIT\s*;\s*$/i, "");
  const statements = splitSql(body);
  await sql.transaction((tx) => [
    ...statements.map((statement) => tx.query(statement)),
    tx`INSERT INTO schema_migrations(filename,checksum) VALUES(${filename},${checksum})`,
  ]);
  applied += 1;
  console.log(`Applied: ${filename}`);
}

const tables = await sql`SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public'`;
console.log(`Database connection: OK`);
console.log(`Migrations applied now: ${applied}`);
console.log(`Public tables: ${tables[0].count}`);
