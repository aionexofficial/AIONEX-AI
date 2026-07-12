"use client";
import Link from "next/link";
import { useState } from "react";
type Stats={claims:number;earned:number;lastClaim:string|null;cooldownHours:number};
export function MiningPage({authenticated,initial}:{authenticated:boolean;initial:Stats}){
 const[stats,setStats]=useState(initial),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[now]=useState(()=>Date.now());
 const ready=!stats.lastClaim||now-new Date(stats.lastClaim).getTime()>=stats.cooldownHours*3600000;
 async function claim(){setBusy(true);const r=await fetch("/api/rewards/mine",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});const data=await r.json();if(r.ok){const fresh=await fetch("/api/rewards/mining/stats",{cache:"no-store"}).then(x=>x.json()) as {stats:Stats};setStats(fresh.stats);setMessage("Mining reward claimed securely.");}else setMessage(data.error);setBusy(false);}
 return <main className="min-h-screen bg-[#020711] p-5 text-white"><div className="mx-auto max-w-4xl py-8"><Link href="/rewards" className="text-xs text-cyan-300">← Rewards</Link><h1 className="mt-4 text-5xl font-semibold">Daily mining</h1><p className="mt-3 text-slate-500">Server-enforced cooldown with atomic PostgreSQL ledger awards.</p><div className="mt-8 grid gap-4 sm:grid-cols-3">{[["Claims",stats.claims],["Mining AXP",stats.earned],["Cooldown",`${stats.cooldownHours} hours`]].map(([label,value])=><div key={label} className="rounded-2xl border border-white/10 bg-[#081321] p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl">{value}</p></div>)}</div>{message&&<p className="mt-5 text-sm text-cyan-200">{message}</p>}<button onClick={claim} disabled={!authenticated||!ready||busy} className="mt-6 rounded-xl bg-cyan-300 px-6 py-3 font-semibold text-slate-950 disabled:opacity-40">{busy?"Claiming…":!authenticated?"Authenticate in Rewards":ready?"Claim mining reward":"Cooldown active"}</button></div></main>;
}
