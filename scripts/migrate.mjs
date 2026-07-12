import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing.");

const sql = neon(databaseUrl);
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
  const statements = body.split(";").map((statement) => statement.trim()).filter(Boolean);
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
