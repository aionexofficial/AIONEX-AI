import "server-only";

import { neon } from "@neondatabase/serverless";
import type { AutomationPost } from "./types";

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}

let schemaReady: Promise<void> | undefined;
export function ensureAutomationSchema() {
  if (!schemaReady) schemaReady = (async () => {
    const sql = database();
    await sql`CREATE TABLE IF NOT EXISTS automation_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL,
      body TEXT NOT NULL,
      social_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','published','failed')),
      scheduled_for DATE NOT NULL UNIQUE,
      published_at TIMESTAMPTZ,
      telegram_status TEXT NOT NULL DEFAULT 'pending' CHECK (telegram_status IN ('pending','published','failed','skipped')),
      telegram_post_id TEXT,
      x_status TEXT NOT NULL DEFAULT 'pending' CHECK (x_status IN ('pending','published','failed','skipped')),
      x_post_id TEXT,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS automation_posts_published_at_idx ON automation_posts (published_at DESC) WHERE status = 'published'`;
  })().catch((error) => { schemaReady = undefined; throw error; });
  return schemaReady;
}

function map(row: Record<string, unknown>): AutomationPost {
  return { id: String(row.id), title: String(row.title), slug: String(row.slug), excerpt: String(row.excerpt), body: String(row.body), socialText: String(row.social_text), status: row.status as AutomationPost["status"], scheduledFor: String(row.scheduled_for).slice(0, 10), publishedAt: row.published_at ? new Date(String(row.published_at)).toISOString() : null, telegramStatus: row.telegram_status as AutomationPost["telegramStatus"], telegramPostId: row.telegram_post_id ? String(row.telegram_post_id) : null, xStatus: row.x_status as AutomationPost["xStatus"], xPostId: row.x_post_id ? String(row.x_post_id) : null, lastError: row.last_error ? String(row.last_error) : null, createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString() };
}

export async function listPosts(publishedOnly = false) {
  await ensureAutomationSchema();
  const sql = database();
  const rows = publishedOnly
    ? await sql`SELECT * FROM automation_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 100`
    : await sql`SELECT * FROM automation_posts ORDER BY scheduled_for DESC LIMIT 100`;
  return rows.map((row) => map(row));
}

export async function getPost(id: string) {
  await ensureAutomationSchema();
  const rows = await database()`SELECT * FROM automation_posts WHERE id = ${id}::uuid LIMIT 1`;
  return rows[0] ? map(rows[0]) : null;
}

export async function findPostForDay(day: string) {
  await ensureAutomationSchema();
  const rows = await database()`SELECT * FROM automation_posts WHERE scheduled_for = ${day}::date LIMIT 1`;
  return rows[0] ? map(rows[0]) : null;
}

export async function createPost(input: Omit<AutomationPost, "id" | "publishedAt" | "telegramStatus" | "telegramPostId" | "xStatus" | "xPostId" | "lastError" | "createdAt" | "updatedAt">) {
  await ensureAutomationSchema();
  const rows = await database()`INSERT INTO automation_posts (title, slug, excerpt, body, social_text, status, scheduled_for) VALUES (${input.title}, ${input.slug}, ${input.excerpt}, ${input.body}, ${input.socialText}, ${input.status}, ${input.scheduledFor}::date) RETURNING *`;
  return map(rows[0]);
}

export async function updatePost(id: string, input: { title: string; excerpt: string; body: string; socialText: string; status: AutomationPost["status"] }) {
  await ensureAutomationSchema();
  const rows = await database()`UPDATE automation_posts SET title=${input.title}, excerpt=${input.excerpt}, body=${input.body}, social_text=${input.socialText}, status=${input.status}, updated_at=NOW(), last_error=NULL WHERE id=${id}::uuid RETURNING *`;
  return rows[0] ? map(rows[0]) : null;
}

export async function updateDelivery(id: string, input: { telegramStatus: AutomationPost["telegramStatus"]; telegramPostId?: string | null; xStatus: AutomationPost["xStatus"]; xPostId?: string | null; status: AutomationPost["status"]; error?: string | null }) {
  const rows = await database()`UPDATE automation_posts SET telegram_status=${input.telegramStatus}, telegram_post_id=COALESCE(${input.telegramPostId ?? null}, telegram_post_id), x_status=${input.xStatus}, x_post_id=COALESCE(${input.xPostId ?? null}, x_post_id), status=${input.status}, last_error=${input.error ?? null}, published_at=CASE WHEN ${input.status}='published' THEN COALESCE(published_at, NOW()) ELSE published_at END, updated_at=NOW() WHERE id=${id}::uuid RETURNING *`;
  return rows[0] ? map(rows[0]) : null;
}
