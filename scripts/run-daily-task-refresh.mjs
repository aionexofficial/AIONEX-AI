const baseUrl=(process.env.DAILY_TASK_REFRESH_URL||process.env.NEXT_PUBLIC_APP_URL||"https://aionex-ai.vercel.app").replace(/\/$/,"");
const secret=process.env.CRON_SECRET?.trim();
if(!secret)throw new Error("CRON_SECRET is not configured.");
const response=await fetch(`${baseUrl}/api/cron/daily-tasks`,{headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(60_000)});
const result=await response.json().catch(()=>({}));
if(!response.ok)throw new Error(`Daily-task recovery failed (${response.status}).`);
console.log(JSON.stringify({ok:true,period:result.period,tasks:result.tasks,assignments:result.assignments,notificationSent:result.notificationSent}));
