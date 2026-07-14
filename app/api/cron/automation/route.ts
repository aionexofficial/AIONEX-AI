import { enqueue, runWorker } from "@/lib/automation/engine";
import { logError } from "@/lib/observability/logger";
export const maxDuration=300;
export async function GET(request:Request){if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:"Unauthorized"},{status:401});try{const hour=new Date().toISOString().slice(0,13);await Promise.all([enqueue("market.analyze",{},`market:${hour}`),enqueue("hourly.pipeline",{runKey:hour},`pipeline:${hour}`)]);return Response.json({ok:true,worker:await runWorker(8)},{headers:{"Cache-Control":"no-store"}});}catch(error){logError("cron.automation",error);return Response.json({ok:false,error:"Automation run failed."},{status:500});}}
