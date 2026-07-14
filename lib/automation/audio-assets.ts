import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const AUDIO_URL_TTL_MS = 15 * 60 * 1000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(process.env.DATABASE_URL);
}

function secret() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET is not configured for signed automation media URLs.");
  }
  return process.env.AUTH_SECRET;
}

function signature(id: string, expires: number) {
  return createHmac("sha256", secret()).update(`${id}.${expires}`).digest("base64url");
}

export async function storeNarration(audio: Buffer) {
  const expires = Date.now() + AUDIO_URL_TTL_MS;
  const sql = database();
  const rows = await sql`INSERT INTO media_assets(kind,mime_type,data,metadata)
    VALUES('narration','audio/mpeg',${audio},${JSON.stringify({ expiresAt: new Date(expires).toISOString() })}::jsonb)
    RETURNING id`;
  const id = String(rows[0].id);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    await deleteNarration(id);
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured for automation media URLs.");
  }
  return {
    id,
    url: `${baseUrl.replace(/\/$/, "")}/api/automation/audio/${id}?expires=${expires}&signature=${encodeURIComponent(signature(id, expires))}`,
  };
}

export async function deleteNarration(id: string) {
  if (!uuidPattern.test(id)) return;
  await database()`DELETE FROM media_assets WHERE id=${id}::uuid AND kind='narration'`;
}

export function verifyNarrationUrl(id: string, expiresText: string | null, supplied: string | null) {
  if (!uuidPattern.test(id) || !expiresText || !supplied) return false;
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= Date.now() || expires > Date.now() + AUDIO_URL_TTL_MS) return false;
  const expected = Buffer.from(signature(id, expires));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function readNarration(id: string) {
  if (!uuidPattern.test(id)) return null;
  const rows = await database()`SELECT data,mime_type,metadata FROM media_assets WHERE id=${id}::uuid AND kind='narration' LIMIT 1`;
  const row = rows[0];
  if (!row?.data) return null;
  const metadata = row.metadata as { expiresAt?: string } | null;
  if (!metadata?.expiresAt || new Date(metadata.expiresAt).getTime() <= Date.now()) {
    await deleteNarration(id);
    return null;
  }
  return { data: Buffer.from(row.data as Uint8Array), mimeType: String(row.mime_type || "audio/mpeg") };
}
