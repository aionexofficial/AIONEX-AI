"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Sign in failed.");
      router.replace("/admin");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sign in failed."); }
    finally { setLoading(false); }
  }

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#02050b] p-5 text-white"><div className="stars opacity-40" /><div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[100px]" /><section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-100/15 bg-[#07101d]/85 p-7 shadow-[0_30px_100px_rgba(0,0,0,.55),0_0_60px_rgba(34,211,238,.06)] backdrop-blur-2xl sm:p-9"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" /><Link href="/" className="text-sm font-bold tracking-tight">AIONEX <span className="text-cyan-300">AI</span></Link><div className="mt-10"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">◆</div><p className="dashboard-kicker">SECURE CONTROL PLANE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin access</h1><p className="mt-3 text-sm leading-6 text-slate-400">Authenticate to manage the AIONEX ecosystem.</p></div><form onSubmit={submit} className="mt-8 space-y-4"><label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">Username</span><input type="text" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition placeholder:text-slate-700 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/[.06]" placeholder="Admin username" /></label><label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/[.06]" /></label>{error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[.07] px-4 py-3 text-xs text-rose-200">{error}</p>}<button disabled={loading} className="mt-2 w-full rounded-xl bg-cyan-300 px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_28px_rgba(34,211,238,.18)] transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{loading ? "Authenticating…" : "Enter admin panel"}</button></form><p className="mt-6 text-center text-[10px] uppercase tracking-[.14em] text-slate-600">Protected by signed session authentication</p></section></main>;
}
