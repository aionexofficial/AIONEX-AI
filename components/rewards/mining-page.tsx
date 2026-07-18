"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Stats = { claims: number; earned: number; lastClaim: string | null; cooldownHours: number };
type Session = { id: string; status: string; startedAt: string; endsAt: string; stoppedAt: string | null; durationSeconds: number | null; awardedAxp: number; awardedXp: number };
type Status = { stats: Stats; session: Session | null; history: Session[]; rewards: { axp: number; xp: number; sessionMinutes: number }; serverTime: string };

const format = (milliseconds: number) => {
  const seconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

export function MiningPage({ authenticated, initial }: { authenticated: boolean; initial: Stats }) {
  const [data, setData] = useState<Status>({ stats: initial, session: null, history: [], rewards: { axp: 100, xp: 25, sessionMinutes: 60 }, serverTime: new Date().toISOString() });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    if (!authenticated) return;
    const response = await fetch("/api/rewards/mining/stats", { cache: "no-store" });
    if (response.ok) setData(await response.json() as Status);
  }, [authenticated]);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const poll = window.setInterval(() => void load(), 15_000);
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearTimeout(first); window.clearInterval(poll); document.removeEventListener("visibilitychange", visible); };
  }, [load]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);

  const remaining = Math.max(0, (data.session ? new Date(data.session.endsAt).getTime() : now) - now);
  const progress = useMemo(() => {
    if (!data.session) return 0;
    const start = new Date(data.session.startedAt).getTime();
    const end = new Date(data.session.endsAt).getTime();
    return Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
  }, [data.session, now]);
  const liveAxp = data.session ? Math.floor(data.rewards.axp * progress / 100) : 0;
  const liveXp = data.session ? Math.floor(data.rewards.xp * progress / 100) : 0;
  const cooldownUntil = data.stats.lastClaim ? new Date(data.stats.lastClaim).getTime() + data.stats.cooldownHours * 3_600_000 : 0;
  const cooldown = Math.max(0, cooldownUntil - now);

  async function action(kind: "start" | "stop") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/rewards/mining/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await response.json() as { error?: string };
      setMessage(response.ok ? (kind === "start" ? "Mining started. Progress is secured on the server." : "Mining stopped and rewards were recorded.") : body.error || "Mining request failed.");
      await load();
    } catch {
      setMessage("Mining is temporarily unavailable. Your existing server session is safe.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#020711] p-5 text-white"><div className="mx-auto max-w-4xl py-8">
    <Link href="/rewards" className="text-xs text-cyan-300">← Rewards</Link>
    <h1 className="mt-4 text-5xl font-semibold">Secure mining</h1>
    <p className="mt-3 text-slate-500">Server-validated sessions continue across refreshes and devices. Rewards settle atomically in PostgreSQL.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-3">{[["Sessions", data.stats.claims], ["Mining AXP", data.stats.earned + liveAxp], ["Cooldown", `${data.stats.cooldownHours} hours`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-[#081321] p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl tabular-nums">{value}</p></div>)}</div>
    <section className="mt-6 rounded-3xl border border-cyan-300/15 bg-[#081321] p-6">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-cyan-300">{data.session ? "Mining active" : cooldown > 0 ? "Cooldown" : "Ready"}</p><p className="mt-2 text-4xl font-semibold tabular-nums">{data.session ? format(remaining) : cooldown > 0 ? format(cooldown) : "00:00:00"}</p>{data.session && <p className="mt-2 text-sm tabular-nums text-emerald-300">+{liveAxp} AXP · +{liveXp} XP secured so far</p>}</div><span className={`h-4 w-4 rounded-full ${data.session ? "animate-pulse bg-emerald-300" : "bg-slate-600"}`} /></div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-[width] duration-1000" style={{ width: `${progress}%` }} /></div>
      {message && <p role="status" className="mt-5 text-sm text-cyan-100">{message}</p>}
      <button onClick={() => void action(data.session ? "stop" : "start")} disabled={!authenticated || busy || (!data.session && cooldown > 0)} className="mt-6 w-full rounded-xl bg-cyan-300 px-6 py-3 font-semibold text-slate-950 disabled:opacity-40">{busy ? "Processing…" : !authenticated ? "Authenticate in Rewards" : data.session ? "Stop Mining" : "Start Mining"}</button>
    </section>
    {data.history.length > 0 && <section className="mt-8"><h2 className="text-xl font-semibold">Mining history</h2><div className="mt-4 space-y-2">{data.history.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.02] p-4 text-sm"><span>{new Date(item.startedAt).toLocaleString()}</span><span className="text-emerald-300">+{item.awardedAxp} AXP · +{item.awardedXp} XP</span></div>)}</div></section>}
  </div></main>;
}
