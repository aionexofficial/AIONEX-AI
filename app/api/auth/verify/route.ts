import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { verifyMessage } from "viem";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (exceedsContentLength(request, 16_384)) return Response.json({ error: "Request is too large." }, { status: 413 });
  try {
    const { address, message, signature } = await request.json() as { address?: string; message?: string; signature?: string };
    if (!/^0x[a-fA-F0-9]{40}$/.test(address || "") || !/^0x[a-fA-F0-9]+$/.test(signature || "") || typeof message !== "string" || message.length > 2_000) return Response.json({ error: "Invalid authentication request." }, { status: 400 });
    const jar = await cookies();
    const nonce = jar.get("aionex_nonce")?.value;
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32 || !nonce || !message.includes(nonce)) return Response.json({ error: "Authentication unavailable or expired." }, { status: 401 });
    if (!await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` })) return Response.json({ error: "Invalid signature." }, { status: 401 });
    const payload = Buffer.from(JSON.stringify({ address, exp: Date.now() + 86_400_000 })).toString("base64url");
    const signed = createHmac("sha256", secret).update(payload).digest("base64url");
    jar.delete("aionex_nonce");
    jar.set("aionex_session", `${payload}.${signed}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 86_400, path: "/" });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError("auth.wallet.verify", error);
    return Response.json({ error: "Invalid authentication request." }, { status: 400 });
  }
}
