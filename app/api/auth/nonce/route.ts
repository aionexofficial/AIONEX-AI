import { cookies } from "next/headers";
import { randomUUID } from "crypto";
export async function GET() { const nonce = randomUUID(); (await cookies()).set("aionex_nonce", nonce, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 300, path: "/" }); return Response.json({ nonce }); }
