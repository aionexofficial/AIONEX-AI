"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BatteryCharging, ChevronRight, Flame, Gift, Sparkles, Target, Zap } from "lucide-react";
import type { RewardProfile, RewardTask } from "@/lib/rewards/types";
import { AionCharacter } from "./aion-character";
import { useAion } from "./aion-provider";

type Props = { profile: RewardProfile | null; tasks: RewardTask[]; busy: string; onMine: () => void; onTasks: () => void; onProfile: () => void; onCheckIn: () => void };

export function AionHomeExperience({ profile, tasks, busy, onMine, onTasks, onProfile, onCheckIn }: Props) {
  const { state, loading } = useAion();
  const reduced = useReducedMotion();
  const level = state?.user.level ?? profile?.level ?? 1;
  const xp = state?.progression.currentXp ?? ((profile?.xp ?? 0) % 500);
  const requiredXp = state?.progression.requiredXp ?? 500;
  const energy = state?.energy.current ?? 1000;
  const maxEnergy = state?.energy.maximum ?? 1000;
  const stage = state?.stage ?? { key: "core" as const, name: "AION Core", minLevel: 1, maxLevel: 5, description: "A newly awakened intelligence core.", rings: 1, form: "core" as const };
  const completedTasks = tasks.filter(task => task.completed).length;

  return <div className="space-y-4 pb-2">
    <header className="flex items-center justify-between">
      <div><p className="text-[9px] font-bold uppercase tracking-[.28em] text-cyan-300/70">Project AION</p><p className="mt-1 text-xs text-slate-400">Linked intelligence · <span className="text-emerald-300">Online</span></p></div>
      <button onClick={onProfile} aria-label="Open profile" className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/[.07] text-sm font-black text-cyan-100">{(profile?.displayName?.[0] || "A").toUpperCase()}</button>
    </header>
    <section className="aion-command-deck relative isolate min-h-[570px] overflow-hidden rounded-[34px] border border-cyan-200/[.14] bg-[#050b16] px-5 pb-5 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_28px_80px_rgba(0,0,0,.45)]">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,.18),transparent_30%),radial-gradient(circle_at_50%_58%,rgba(99,102,241,.13),transparent_45%),linear-gradient(180deg,rgba(6,182,212,.04),transparent_40%)]" />
      <div aria-hidden className="aion-grid absolute inset-x-0 bottom-0 h-52 opacity-35" />
      <div className="relative z-10 flex items-start justify-between"><div><p className="text-[9px] uppercase tracking-[.2em] text-cyan-300">{stage.name}</p><h1 className="mt-1 text-2xl font-black tracking-tight">{state?.character.name ?? "AION"}</h1></div><button onClick={onProfile} className="rounded-full border border-violet-300/15 bg-violet-400/[.08] px-3 py-1.5 text-[9px] font-bold text-violet-200">LVL {level}</button></div>
      <div className="relative z-10 -my-1 flex justify-center"><motion.div animate={reduced ? undefined : { filter: ["drop-shadow(0 0 16px rgba(34,211,238,.22))", "drop-shadow(0 0 30px rgba(34,211,238,.4))", "drop-shadow(0 0 16px rgba(34,211,238,.22))"] }} transition={{ duration: 3.4, repeat: Infinity }}><AionCharacter stage={stage.key} color={state?.character.energyColor ?? "cyan"} label="Open AION mining" onTap={onMine} /></motion.div></div>
      <div className="relative z-10 -mt-4 text-center"><motion.p key={state?.dialogue} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto min-h-8 max-w-[300px] text-xs leading-5 text-cyan-50/80">{loading ? "Synchronizing our neural link..." : state?.dialogue ?? "Hello... Are you my creator?"}</motion.p><button onClick={onMine} className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-200 via-cyan-300 to-blue-400 px-6 py-3 text-xs font-black text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.22)]">Tap AION to earn <ChevronRight size={14} /></button></div>
      <div className="relative z-10 mt-5 grid grid-cols-3 divide-x divide-white/[.07] rounded-2xl border border-white/[.07] bg-black/20 py-3 backdrop-blur-sm"><Metric label="AXP" value={(state?.user.axpBalance ?? profile?.axpBalance ?? 0).toLocaleString()} /><Metric label="Tap power" value={`+${state?.mining.tapPower ?? 1}`} /><Metric label="Streak" value={`${state?.user.streak ?? profile?.loginStreak ?? 0}d`} /></div>
      <div className="relative z-10 mt-4 space-y-3"><Progress icon={<BatteryCharging size={12}/>} label="Energy" value={`${energy} / ${maxEnergy}`} percent={energy / maxEnergy * 100} tone="from-amber-300 to-cyan-300" /><Progress icon={<Sparkles size={12}/>} label={`Level ${level} XP`} value={`${xp} / ${requiredXp}`} percent={xp / requiredXp * 100} tone="from-violet-400 to-cyan-300" /></div>
    </section>
    <div className="grid grid-cols-2 gap-3"><button onClick={onCheckIn} className="rounded-2xl border border-amber-300/10 bg-amber-300/[.05] p-4 text-left"><Flame size={17} className="text-amber-300"/><p className="mt-3 text-[9px] uppercase tracking-wider text-slate-500">Daily reward</p><p className="mt-1 text-xs font-semibold">{busy === "checkin" ? "Claiming..." : `${profile?.loginStreak ?? 0} day streak`}</p></button><button onClick={onTasks} className="rounded-2xl border border-violet-300/10 bg-violet-300/[.05] p-4 text-left"><Target size={17} className="text-violet-300"/><p className="mt-3 text-[9px] uppercase tracking-wider text-slate-500">Missions</p><p className="mt-1 text-xs font-semibold">{completedTasks}/{tasks.length} complete</p></button></div>
    <button onClick={onTasks} className="flex w-full items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Gift size={18}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">A new mission is available</span><span className="mt-1 block truncate text-[9px] text-slate-500">Complete verified actions to evolve AION.</span></span><ChevronRight size={15} className="text-slate-600"/></button>
    <p className="flex items-center justify-center gap-1.5 text-[8px] uppercase tracking-[.18em] text-slate-600"><Zap size={10}/> Server-authoritative evolution</p>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="text-center"><p className="text-[8px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm font-black text-white">{value}</p></div>; }
function Progress({ icon, label, value, percent, tone }: { icon: React.ReactNode; label: string; value: string; percent: number; tone: string }) { return <div><div className="mb-1.5 flex justify-between text-[9px]"><span className="flex items-center gap-1 text-slate-400">{icon}{label}</span><span className="text-slate-300">{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><motion.div initial={false} animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }} className={`h-full rounded-full bg-gradient-to-r ${tone}`} /></div></div>; }
