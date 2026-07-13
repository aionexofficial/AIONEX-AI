"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Stats={claims:number;earned:number;lastClaim:string|null;cooldownHours:number};
type Session={id:string;status:string;startedAt:string;endsAt:string;stoppedAt:string|null;durationSeconds:number|null;awardedAxp:number;awardedXp:number};
type Status={stats:Stats;session:Session|null;history:Session[];serverTime:string};

export function MiningPage({authenticated,initial}:{authenticated:boolean;initial:Stats}){
 const[data,setData]=useState<Status>({stats:initial,session:null,history:[],serverTime:new Date().toISOString()});
 const[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[now,setNow]=useState(0);
 const load=useCallback(async()=>{if(!authenticated)return;const r=await fetch("/api/rewards/mining/stats",{cache:"no-store"});if(r.ok)setData(await r.json() as Status);},[authenticated]);
 useEffect(()=>{const id=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(id)},[load]);
 useEffect(()=>{const tick=()=>setNow(Date.now());const first=window.setTimeout(tick,0),id=window.setInterval(tick,1000);return()=>{window.clearTimeout(first);window.clearInterval(id)}},[]);
 const remaining=Math.max(0,(data.session?new Date(data.session.endsAt).getTime():now)-now);
 const progress=useMemo(()=>{if(!data.session)return 0;const start=new Date(data.session.startedAt).getTime(),end=new Date(data.session.endsAt).getTime();return Math.min(100,Math.max(0,(now-start)/(end-start)*100))},[data.session,now]);
 const cooldownUntil=data.stats.lastClaim?new Date(data.stats.lastClaim).getTime()+data.stats.cooldownHours*3_600_000:0;
 const cooldown=Math.max(0,cooldownUntil-now);
 const format=(ms:number)=>{const seconds=Math.ceil(ms/1000),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`};
 async function action(kind:"start"|"stop"){setBusy(true);setMessage("");try{const r=await fetch(`/api/rewards/mining/${kind}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});const body=await r.json() as {error?:string};setMessage(r.ok?(kind==="start"?"Mining started. Progress is secured on the server.":"Mining stopped and rewards were recorded."):body.error||"Mining request failed.");await load()}finally{setBusy(false)}}
 return <main className="min-h-screen bg-[#020711] p-5 text-white"><div className="mx-auto max-w-4xl py-8"><Link href="/rewards" className="text-xs text-cyan-300">← Rewards</Link><h1 className="mt-4 text-5xl font-semibold">Secure mining</h1><p className="mt-3 text-slate-500">Server-validated sessions continue across refreshes and award rewards through the atomic PostgreSQL ledger.</p>
 <div className="mt-8 grid gap-4 sm:grid-cols-3">{[["Sessions",data.stats.claims],["Mining AXP",data.stats.earned],["Cooldown",`${data.stats.cooldownHours} hours`]].map(([label,value])=><div key={label} className="rounded-2xl border border-white/10 bg-[#081321] p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl">{value}</p></div>)}</div>
 <section className="mt-6 rounded-3xl border border-cyan-300/15 bg-[#081321] p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-cyan-300">{data.session?"Mining active":cooldown>0?"Cooldown":"Ready"}</p><p className="mt-2 text-4xl font-semibold tabular-nums">{data.session?format(remaining):cooldown>0?format(cooldown):"00:00:00"}</p></div><span className={`h-4 w-4 rounded-full ${data.session?"animate-pulse bg-emerald-300":"bg-slate-600"}`}/></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-[width] duration-1000" style={{width:`${progress}%`}}/></div>{message&&<p role="status" className="mt-5 text-sm text-cyan-100">{message}</p>}<button onClick={()=>void action(data.session?"stop":"start")} disabled={!authenticated||busy||(!data.session&&cooldown>0)} className="mt-6 w-full rounded-xl bg-cyan-300 px-6 py-3 font-semibold text-slate-950 disabled:opacity-40">{busy?"Processing…":!authenticated?"Authenticate in Rewards":data.session?"Stop Mining":"Start Mining"}</button></section>
 {data.history.length>0&&<section className="mt-8"><h2 className="text-xl font-semibold">Mining history</h2><div className="mt-4 space-y-2">{data.history.map(item=><div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.02] p-4 text-sm"><span>{new Date(item.startedAt).toLocaleString()}</span><span className="text-emerald-300">+{item.awardedAxp} AXP · +{item.awardedXp} XP</span></div>)}</div></section>}</div></main>;
}
