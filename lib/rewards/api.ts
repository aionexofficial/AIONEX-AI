import "server-only";

import { getRewardUserId } from "./session";

export async function requireRewardUser() {
  const userId = await getRewardUserId();
  return userId ? { userId } : null;
}

export const unauthorized = () => Response.json({ error: "Connect a wallet or authenticate through Telegram." }, { status: 401 });
