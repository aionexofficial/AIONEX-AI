import { cookies } from "next/headers";
import { verifyMessage } from "viem";
import { findOrCreateIdentity } from "@/lib/rewards/db";
import { getRewardUserId, setRewardSession } from "@/lib/rewards/session";
import { isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const { address, message, signature } = await request.json() as { address?: string; message?: string; signature?: string };
    if (!/^0x[a-fA-F0-9]{40}$/.test(address || "") || !/^0x[a-fA-F0-9]+$/.test(signature || "") || typeof message !== "string") return Response.json({ error: "Invalid wallet proof." }, { status: 400 });
    const jar = await cookies();
    const nonce = jar.get("aionex_nonce")?.value;
    if (!nonce || !message.includes(nonce) || !await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` })) return Response.json({ error: "Invalid or expired wallet proof." }, { status: 401 });
    const userId = await findOrCreateIdentity("wallet", address!.toLowerCase(), { address: address!.toLowerCase() }, await getRewardUserId());
    jar.delete("aionex_nonce");
    await setRewardSession(userId);
    return Response.json({ ok: true });
  } catch (error) { logError("rewards.auth.wallet", error); return Response.json({ error: "Wallet authentication failed." }, { status: 500 }); }
}
