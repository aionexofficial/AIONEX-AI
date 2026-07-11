"use client";

import { useEffect, useState } from "react";

type Article = { title: string; source: string; url: string };
const fallback = [{ title: "Market intelligence is refreshing. Live price signals remain available.", source: "AIONEX", url: "#" }];

export function AnalysisPanel() {
  const [change, setChange] = useState(0);
  const [cap, setCap] = useState<number>();
  const [dominance, setDominance] = useState<number>();
  const [articles, setArticles] = useState<Article[]>(fallback);
  useEffect(() => {
    const load = async () => {
      try { const r = await fetch("https://api.coingecko.com/api/v3/global"); const data = await r.json(); setChange(data.data?.market_cap_change_percentage_24h_usd ?? 0); setCap(data.data?.total_market_cap?.usd); setDominance(data.data?.market_cap_percentage?.btc); } catch { /* Public API can be rate limited. */ }
      try { const r = await fetch("/api/market-news"); const data = await r.json(); if (data.items?.length) setArticles(data.items); } catch { /* Retain fallback. */ }
    };
    load(); const timer = setInterval(load, 60000); return () => clearInterval(timer);
  }, []);
  const outlook = change > 1 ? "CONSTRUCTIVE" : change < -1 ? "DEFENSIVE" : "NEUTRAL";
  const confidence = Math.min(78, Math.max(52, Math.round(64 + change * 4)));
  const compact = (value?: number) => value ? new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value) : "—";
  return <div className="grid gap-8 xl:grid-cols-2"><section className="dashboard-card overflow-hidden"><div className="p-6"><p className="dashboard-kicker">AIONEX AI ANALYSIS</p><div className="mt-2 flex items-center justify-between"><h2 className="text-xl font-semibold">Market regime</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${change >= 0 ? "bg-emerald-300/10 text-emerald-300" : "bg-rose-300/10 text-rose-300"}`}>{outlook}</span></div><p className="mt-4 text-sm leading-7 text-slate-400">The model reads broad market participation, liquidity, and dominance to define the current risk environment.</p></div><div className="grid grid-cols-3 divide-x divide-white/10 border-y border-white/10"><Metric label="Market cap" value={compact(cap)} /><Metric label="24h change" value={`${change >= 0 ? "+" : ""}${change.toFixed(2)}%`} /><Metric label="BTC dominance" value={dominance ? `${dominance.toFixed(1)}%` : "—"} /></div></section><section className="dashboard-card p-6"><p className="dashboard-kicker">MODEL FORECAST</p><h2 className="mt-1 text-xl font-semibold">7-day direction</h2><div className="mt-6 flex items-center gap-5"><div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(#3de3ff ${confidence * 3.6}deg, rgba(255,255,255,.1) 0deg)` }}><div className="grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full bg-[#07111e]"><b className="text-2xl text-cyan-100">{confidence}%</b><small className="text-[9px] text-slate-500">UPSIDE</small></div></div><p className="max-w-xs text-sm leading-7 text-slate-400">{outlook === "CONSTRUCTIVE" ? "Trend and breadth indicate selective upside potential." : "The model favors patience until broad market conditions improve."}</p></div><p className="mt-6 border-t border-white/10 pt-4 text-[11px] leading-5 text-slate-500">Educational market intelligence only. Not financial advice or a performance guarantee.</p></section><section className="dashboard-card p-6 xl:col-span-2"><div className="flex items-end justify-between"><div><p className="dashboard-kicker">LIVE CRYPTO NEWS</p><h2 className="mt-1 text-xl font-semibold">News intelligence</h2></div><span className="text-xs text-slate-500">Refreshes every minute</span></div><div className="mt-5 grid gap-2 md:grid-cols-3">{articles.slice(0, 3).map((article) => <a key={article.title} href={article.url} target={article.url === "#" ? undefined : "_blank"} rel="noreferrer" className="rounded-xl p-3 transition hover:bg-white/5"><p className="text-sm font-medium leading-5 text-slate-200">{article.title}</p><p className="mt-3 text-[11px] text-cyan-300">{article.source}</p></a>)}</div></section></div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="p-4"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-cyan-100">{value}</p></div>; }
