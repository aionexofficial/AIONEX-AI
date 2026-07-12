import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export async function GET() {
  const nonce = randomUUID();
  (await cookies()).set("aionex_nonce", nonce, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 300, path: "/" });
  return Response.json({ nonce }, { headers: { "Cache-Control": "no-store" } });
}
