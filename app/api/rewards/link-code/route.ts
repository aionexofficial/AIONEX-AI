import { createLinkCode } from "@/lib/rewards/db";
import { requireRewardUser, unauthorized } from "@/lib/rewards/api";
export async function POST(){const auth=await requireRewardUser();if(!auth)return unauthorized();const username=process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/,"");if(!username)return Response.json({error:"Telegram bot username is not configured."},{status:503});const code=await createLinkCode(auth.userId);return Response.json({code,deepLink:`https://t.me/${username}?start=link_${code}`,expiresIn:900});}
