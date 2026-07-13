import { loadEnvFile } from "node:process";
try { loadEnvFile(".env.local"); } catch {}
const required=["AUTH_SECRET","ADMIN_USERNAME","ADMIN_EMAIL","ADMIN_PASSWORD_HASH","DATABASE_URL","CRON_SECRET","TELEGRAM_BOT_TOKEN","TELEGRAM_BOT_USERNAME","TELEGRAM_WEBHOOK_SECRET","NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID","NEXT_PUBLIC_SITE_URL","AUTO_PUBLISH"];
const errors=required.filter(name=>!process.env[name]?.trim()).map(name=>`Missing: ${name}`);
if((process.env.AUTH_SECRET||"").length<32)errors.push("AUTH_SECRET must contain at least 32 characters.");
if((process.env.CRON_SECRET||"").length<32)errors.push("CRON_SECRET must contain at least 32 characters.");
if((process.env.TELEGRAM_WEBHOOK_SECRET||"").length<24)errors.push("TELEGRAM_WEBHOOK_SECRET must contain at least 24 characters.");
if(process.env.NEXT_PUBLIC_SITE_URL!=="https://aionex-ai.vercel.app")errors.push("NEXT_PUBLIC_SITE_URL must be https://aionex-ai.vercel.app.");
if(!/^[^:]+:[a-f\d]{128}$/i.test(process.env.ADMIN_PASSWORD_HASH||""))errors.push("ADMIN_PASSWORD_HASH must be a valid scrypt salt:hash value.");
if(!["true","false"].includes(process.env.AUTO_PUBLISH||""))errors.push("AUTO_PUBLISH must be true or false.");
if(process.env.AUTO_PUBLISH==="true"&&!process.env.OPENAI_API_KEY?.trim())errors.push("OPENAI_API_KEY is required when AUTO_PUBLISH=true.");
const xPublishing=Boolean((process.env.X_CONSUMER_KEY||process.env.X_API_KEY)?.trim()&&(process.env.X_CONSUMER_SECRET||process.env.X_SECRET_KEY||process.env.X_API_SECRET)?.trim()&&process.env.X_ACCESS_TOKEN?.trim()&&process.env.X_ACCESS_TOKEN_SECRET?.trim())||Boolean(process.env.X_USER_ACCESS_TOKEN?.trim());
const xVerification=Boolean(process.env.X_CLIENT_ID?.trim()&&process.env.X_CLIENT_SECRET?.trim());
const youtubeVerification=Boolean((process.env.YOUTUBE_CLIENT_ID||process.env.GOOGLE_CLIENT_ID)?.trim()&&(process.env.YOUTUBE_CLIENT_SECRET||process.env.GOOGLE_CLIENT_SECRET)?.trim());
if(!process.env.GOOGLE_REDIRECT_URI?.trim())errors.push("Missing: GOOGLE_REDIRECT_URI");
const pipelineRequired=["OPENAI_API_KEY","ELEVENLABS_API_KEY","CREATOMATE_API_KEY","TELEGRAM_CHAT_ID"].filter(name=>!process.env[name]?.trim());
console.log(`Production environment: ${errors.length?"INCOMPLETE":"READY"}`);for(const error of errors)console.log(error);
console.log(`X publishing: ${xPublishing?"configured":"disabled"}`);console.log(`X task verification: ${xVerification?"credentials present":"manual review only"}`);console.log(`YouTube task verification: ${youtubeVerification?"credentials present":"manual review only"}`);console.log(`Hourly media pipeline: ${pipelineRequired.length?`missing ${pipelineRequired.join(", ")}`:"configured"}`);
process.exitCode=errors.length?1:0;
