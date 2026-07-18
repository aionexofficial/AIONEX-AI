import "server-only";
import { systemTaskEligible,taskVerificationContext } from "./db";

export type VerificationResult={verified:boolean;message:string};
export async function verifyTask(userId:string,taskId:string):Promise<VerificationResult>{
 const context=await taskVerificationContext(userId,taskId);if(!context)return{verified:false,message:"Task is unavailable."};
 const task=context.task,category=String(task.category),config=(task.verification_config||{}) as Record<string,unknown>;
 if(category==="wallet_connect")return context.identities.some(i=>i.provider==="wallet")?{verified:true,message:"Connected wallet identity verified."}:{verified:false,message:"Connect and verify a wallet first."};
 if(category==="website_visit")return{verified:true,message:"Website visit recorded."};
 if(["daily_login","daily_mining","referral_invite","tap_milestone","ai_chat","referral_milestone","achievement_milestone"].includes(category))return await systemTaskEligible(userId,category,config)?{verified:true,message:"Existing platform activity verified."}:{verified:false,message:"Complete the required platform activity first."};
 if(category==="telegram_join"||category==="telegram_group_join"){
   const telegram=context.identities.find(i=>i.provider==="telegram");if(!telegram)return{verified:false,message:"Link Telegram to your rewards account first."};
   const chatId=String(config.channelId||config.groupId||"");const envKey=String(config.botTokenEnv||"TELEGRAM_BOT_TOKEN");const token=process.env[envKey];
   if(!chatId||!token)return{verified:false,message:"Telegram verification is not configured."};
   const response=await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(String(telegram.provider_user_id))}`,{signal:AbortSignal.timeout(10000)});const body=await response.json() as {ok?:boolean;result?:{status?:string}};
   return body.ok&&["creator","administrator","member","restricted"].includes(body.result?.status||"")?{verified:true,message:"Telegram membership verified."}:{verified:false,message:"Join the configured Telegram community and try again."};
 }
 if(category.startsWith("x_"))return{verified:false,message:"X verification requires a configured OAuth provider. The claim will remain pending; client evidence is never trusted."};
 if(category.startsWith("youtube_"))return{verified:false,message:"YouTube verification requires configured Google OAuth scopes. The claim will remain pending; client evidence is never trusted."};
 return{verified:false,message:"This task requires manual or trusted provider review."};
}
