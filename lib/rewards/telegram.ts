import "server-only";

import { verifyTelegramInitDataWithToken } from "./telegram-init-data";

export function verifyTelegramInitData(initData: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  return verifyTelegramInitDataWithToken(initData, token);
}
