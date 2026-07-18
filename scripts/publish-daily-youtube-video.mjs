import {createDecipheriv,createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {neon} from "@neondatabase/serverless";

const slot=process.argv.find(argument=>argument.startsWith("--day="))?.slice(6)||new Date().toISOString().slice(0,13).replace(":","-");
const directory=resolve("artifacts","local-pipeline",slot),videoPath=resolve(directory,"aionex-daily.mp4"),thumbnailPath=resolve(directory,"youtube-thumbnail.jpg"),metadataPath=resolve(directory,"metadata.json"),reportPath=resolve(directory,"youtube-automation-report.json");
const required=name=>{const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is not configured.`);return value;};
const sql=neon(required("DATABASE_URL")),metadata=JSON.parse(await readFile(metadataPath,"utf8")),video=await readFile(videoPath),thumbnail=await readFile(thumbnailPath);
if(!metadata.validation?.productionReady||!metadata.validation?.audio?.passed)throw new Error("YouTube publishing rejected a missing, silent, or invalid narration track.");
const clientId=process.env.GOOGLE_CLIENT_ID||process.env.YOUTUBE_CLIENT_ID,clientSecret=process.env.GOOGLE_CLIENT_SECRET||process.env.YOUTUBE_CLIENT_SECRET;
if(!clientId||!clientSecret)throw new Error("Google YouTube OAuth client credentials are not configured.");

function decrypt(value){const raw=Buffer.from(value,"base64url"),key=createHash("sha256").update(required("AUTH_SECRET")).digest(),decipher=createDecipheriv("aes-256-gcm",key,raw.subarray(0,12));decipher.setAuthTag(raw.subarray(12,28));return Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString();}
async function token(){const rows=await sql`SELECT encrypted_value FROM integration_credentials WHERE provider='youtube' LIMIT 1`,refreshToken=rows[0]?decrypt(String(rows[0].encrypted_value)):process.env.YOUTUBE_REFRESH_TOKEN;if(!refreshToken)throw new Error("YouTube OAuth authorization is required.");const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"})}),body=await response.json();if(!response.ok||!body.access_token)throw new Error(body.error_description||"YouTube token refresh failed.");return body.access_token;}
async function upload(accessToken,variant,title,description,tags){
  const content=await sql`SELECT id FROM generated_content WHERE metadata->>'slot'=${slot} ORDER BY created_at DESC LIMIT 1`;
  if(!content[0])throw new Error("Generated content record is missing; Telegram publication must establish the shared duplicate lock first.");
  const contentId=String(content[0].id),existing=await sql`SELECT id,video_id,status FROM youtube_uploads WHERE content_id=${contentId}::uuid AND publication_variant=${variant} LIMIT 1`;
  if(existing[0]?.status==="published"&&existing[0]?.video_id)return{variant,videoId:String(existing[0].video_id),skipped:true};
  const locked=existing[0]||await sql`INSERT INTO youtube_uploads(content_id,publication_variant,title,description,tags,thumbnail_prompt,voice_script,status,attempts) VALUES(${contentId}::uuid,${variant},${title.slice(0,100)},${description},${JSON.stringify(tags)}::jsonb,'Generated from validated Remotion frame',${String(metadata.content?.script||"")},'uploading',1) ON CONFLICT(content_id,publication_variant) DO UPDATE SET attempts=youtube_uploads.attempts+1,status='uploading',last_error=NULL,updated_at=NOW() RETURNING id`;
  const uploadId=String(locked.id||locked[0]?.id),boundary=`aionex_${createHash("sha256").update(`${slot}:${variant}`).digest("hex").slice(0,24)}`,youtubeMetadata={snippet:{title:title.slice(0,100),description,tags,categoryId:"28"},status:{privacyStatus:"public",selfDeclaredMadeForKids:false}};
  const head=Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(youtubeMetadata)}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`),tail=Buffer.from(`\r\n--${boundary}--`),response=await fetch("https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart",{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":`multipart/related; boundary=${boundary}`},body:Buffer.concat([head,video,tail])}),body=await response.json();
  if(!response.ok||!body.id){const message=body.error?.message||"YouTube upload failed.";await sql`UPDATE youtube_uploads SET status='failed',last_error=${message},updated_at=NOW() WHERE id=${uploadId}::uuid`;throw new Error(message);}
  const thumbnailResponse=await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(body.id)}&uploadType=media`,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"image/jpeg"},body:thumbnail});
  if(!thumbnailResponse.ok){const message=`YouTube thumbnail upload failed (${thumbnailResponse.status}).`;await sql`UPDATE youtube_uploads SET status='failed',video_id=${body.id},last_error=${message},updated_at=NOW() WHERE id=${uploadId}::uuid`;throw new Error(message);}
  await sql`UPDATE youtube_uploads SET video_id=${body.id},status='published',published_at=NOW(),updated_at=NOW() WHERE id=${uploadId}::uuid`;
  return{variant,videoId:String(body.id),skipped:false};
}

const accessToken=await token(),baseTitle=String(metadata.content?.title||"AIONEX Daily Signal"),description=String(metadata.content?.youtubeDescription||metadata.content?.description||"").trim(),tags=(metadata.content?.hashtags||[]).map(value=>String(value).replace(/^#/,"")).filter(Boolean);
if(!description||tags.length<3)throw new Error("SEO description or tags are missing.");
const results=[];
for(const publication of [{variant:"short",title:`${baseTitle} #Shorts`,description:`${description}\n\n#Shorts`},{variant:"video",title:baseTitle,description}])results.push(await upload(accessToken,publication.variant,publication.title,publication.description,tags));
const report={ok:true,slot,visibility:"public",thumbnail:true,results,x:false,tiktok:false,publishedAt:new Date().toISOString()};
await writeFile(reportPath,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
