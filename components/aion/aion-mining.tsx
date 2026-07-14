"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BatteryCharging, Gauge, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TapBatchResult } from "@/lib/aion/types";
import { AionCharacter, type AionReaction } from "./aion-character";
import { useAion } from "./aion-provider";

type FloatReward = { id: number; x: number; label: string };
export function AionMining({ onAuthoritativeUpdate }: { onAuthoritativeUpdate?: () => void | Promise<void> }) {
  const { state, loading, error, setState, refresh } = useAion();
  const [reaction, setReaction] = useState<AionReaction>("idle"), [floats, setFloats] = useState<FloatReward[]>([]), [notice, setNotice] = useState("");
  const balanceRef = useRef<HTMLSpanElement>(null), energyRef = useRef<HTMLSpanElement>(null), queue = useRef(0), batchStart = useRef(0), flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null), reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null), optimisticBalance = useRef(0), optimisticEnergy = useRef(0), sessionId = useRef("");
  useEffect(() => { if (!state) return; optimisticBalance.current = state.user.axpBalance; optimisticEnergy.current = state.energy.current; if (balanceRef.current) balanceRef.current.textContent = state.user.axpBalance.toLocaleString(); if (energyRef.current) energyRef.current.textContent = `${state.energy.current} / ${state.energy.maximum}`; }, [state]);
  useEffect(() => { sessionId.current = crypto.randomUUID(); return () => { if (flushTimer.current) clearTimeout(flushTimer.current); if (reactionTimer.current) clearTimeout(reactionTimer.current); }; }, []);
  const applyDom = useCallback(() => { if (balanceRef.current) balanceRef.current.textContent = optimisticBalance.current.toLocaleString(); if (energyRef.current && state) energyRef.current.textContent = `${optimisticEnergy.current} / ${state.energy.maximum}`; }, [state]);
  const reconcile = useCallback((result: TapBatchResult) => {
    optimisticBalance.current = result.balance; optimisticEnergy.current = result.energy; applyDom();
    setState(current => current ? { ...current, serverTime: result.serverTime, user: { ...current.user, axpBalance: result.balance, lifetimeAxp: result.lifetimeAxp, xp: result.xp, level: result.level }, character: { ...current.character, totalTaps: result.totalTaps }, energy: { ...current.energy, current: result.energy }, progression: { ...current.progression, totalXp: result.xp, level: result.level, currentXp: result.xp % current.progression.requiredXp } } : current);
    if (result.criticalTaps) setNotice(`CRITICAL ×${result.criticalTaps} · +${result.rewardAxp} AXP`); else if (result.rejectedTaps) setNotice(`${result.acceptedTaps} taps accepted · ${result.rejectedTaps} reconciled`);
    void onAuthoritativeUpdate?.();
  }, [applyDom, onAuthoritativeUpdate, setState]);
  const flush = useCallback(async () => {
    const tapCount = queue.current; if (!tapCount || !state) return; queue.current = 0; const startedAt = batchStart.current; batchStart.current = 0;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    try {
      let deviceId = localStorage.getItem("aion-device-id"); if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem("aion-device-id", deviceId); }
      const response = await fetch("/api/aion/taps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), sessionId: sessionId.current, tapCount, startedAt: new Date(startedAt).toISOString(), endedAt: new Date().toISOString(), deviceId }) });
      const body = await response.json() as { result?: TapBatchResult; error?: string }; if (!response.ok || !body.result) throw new Error(body.error || "Tap sync failed."); reconcile(body.result);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Tap sync failed."); await refresh(); }
  }, [reconcile, refresh, state]);
  const tap = useCallback(() => {
    if (!state || state.economy.earningPaused || optimisticEnergy.current < state.economy.energyCostPerTap) { setReaction("tired"); setNotice("Energy is low. Let us recharge."); return; }
    if (!batchStart.current) batchStart.current = Date.now(); queue.current += 1; optimisticEnergy.current -= state.economy.energyCostPerTap; optimisticBalance.current += state.mining.tapPower; requestAnimationFrame(applyDom);
    const id = Date.now() + queue.current; setFloats(current => [...current.slice(-4), { id, x: Math.round(Math.random() * 90 - 45), label: `+${state.mining.tapPower}` }]); setTimeout(() => setFloats(current => current.filter(item => item.id !== id)), 650);
    setReaction("tap"); if (reactionTimer.current) clearTimeout(reactionTimer.current); reactionTimer.current = setTimeout(() => setReaction(optimisticEnergy.current ? "idle" : "tired"), 260);
    const webApp = (window as typeof window & { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred?: (style: string) => void } } } }).Telegram?.WebApp; webApp?.HapticFeedback?.impactOccurred?.("light");
    if (queue.current >= Math.min(40, state.economy.maxBatchTaps)) void flush(); else { if (flushTimer.current) clearTimeout(flushTimer.current); flushTimer.current = setTimeout(() => void flush(), 700); }
  }, [applyDom, flush, state]);
  if (loading) return <div className="grid min-h-[65dvh] place-items-center text-xs text-cyan-200">Synchronizing AION...</div>;
  if (!state) return <div className="grid min-h-[65dvh] place-items-center rounded-3xl border border-white/10 bg-white/[.03] p-8 text-center"><div><ShieldCheck className="mx-auto text-cyan-300"/><h2 className="mt-4 text-xl font-bold">Authenticate to awaken AION</h2><p className="mt-2 text-xs text-slate-400">Open through Telegram or connect your verified account.</p>{error && <p className="mt-3 text-xs text-rose-300">{error}</p>}</div></div>;
  const energyPercent = Math.max(0, Math.min(100, state.energy.current / state.energy.maximum * 100));
  return <div className="flex min-h-[calc(100dvh-120px)] flex-col">
    <div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.25em] text-cyan-300/70">Raise Your AI. Shape the Future.</p><h2 className="mt-1 text-xl font-black">{state.character.name} · {state.stage.name}</h2></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-[10px] text-cyan-200">LVL {state.user.level}</span></div>
    <section className="relative flex flex-1 flex-col items-center overflow-hidden rounded-[30px] border border-white/[.09] bg-gradient-to-b from-cyan-400/[.07] via-[#07101c] to-violet-500/[.06] px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_25px_60px_rgba(0,0,0,.3)]">
      <div className="w-full"><div className="flex justify-between text-[10px]"><span className="flex items-center gap-1 text-amber-300"><Zap size={13}/> Energy</span><span ref={energyRef}>{state.energy.current} / {state.energy.maximum}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5"><motion.div animate={{ width: `${energyPercent}%` }} className="h-full rounded-full bg-gradient-to-r from-amber-300 to-cyan-300"/></div></div>
      <div className="relative my-3"><AionCharacter stage={state.stage.key} color={state.character.energyColor} reaction={reaction} onTap={tap} disabled={state.economy.earningPaused}/><AnimatePresence>{floats.map(item => <motion.span key={item.id} initial={{ opacity: 1, x: item.x, y: 0, scale: .7 }} animate={{ opacity: 0, y: -80, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: .65 }} className="pointer-events-none absolute left-1/2 top-1/2 z-20 font-black text-cyan-100">{item.label}</motion.span>)}</AnimatePresence></div>
      <p className="text-[9px] uppercase tracking-[.22em] text-slate-500">Authoritative AXP balance</p><p className="mt-1 text-4xl font-black tracking-tight"><span ref={balanceRef}>{state.user.axpBalance.toLocaleString()}</span> <small className="text-sm text-cyan-300">AXP</small></p>
      <p className="mt-3 min-h-5 text-xs text-violet-200">{notice || state.dialogue}</p>
      <div className="mt-5 grid w-full grid-cols-3 gap-2"><div className="rounded-2xl bg-white/[.04] p-3"><Gauge className="mx-auto text-cyan-300" size={15}/><p className="mt-2 text-[9px] text-slate-500">Tap power</p><p className="text-sm font-bold">+{state.mining.tapPower}</p></div><div className="rounded-2xl bg-white/[.04] p-3"><Sparkles className="mx-auto text-violet-300" size={15}/><p className="mt-2 text-[9px] text-slate-500">Critical</p><p className="text-sm font-bold">{(state.mining.criticalChanceBps / 100).toFixed(1)}%</p></div><div className="rounded-2xl bg-white/[.04] p-3"><BatteryCharging className="mx-auto text-emerald-300" size={15}/><p className="mt-2 text-[9px] text-slate-500">Regen</p><p className="text-sm font-bold">+{state.energy.regenAmount}/{state.energy.regenIntervalSeconds}s</p></div></div>
      <div className="mt-4 w-full text-left"><div className="flex justify-between text-[9px] text-slate-500"><span>Level {state.progression.level}</span><span>{state.progression.currentXp} / {state.progression.requiredXp} XP</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><motion.div animate={{ width: `${state.progression.currentXp / state.progression.requiredXp * 100}%` }} className="h-full bg-gradient-to-r from-violet-400 to-cyan-300"/></div></div>
    </section>
  </div>;
}
