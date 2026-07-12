import { createLinkCode } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
export async function POST(){const auth=await requireRewardUser();if(!auth)return unauthorized();const code=await createLinkCode(auth.userId);return Response.json({code,deepLink:`https://t.me/${process.env.TELEGRAM_BOT_USERNAME||"AIONEXAIBot"}?start=link_${code}`,expiresIn:900});}
