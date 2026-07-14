"use client";

import { motion } from "framer-motion";
import { AION_STAGES } from "@/lib/aion/stages";
import { AionCharacter } from "./aion-character";
import { useAion } from "./aion-provider";

export function AionAiPresence({ speaking = false }: { speaking?: boolean }) {
  const { state } = useAion();
  return <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle,rgba(34,211,238,.18),#050b16_70%)]">
    <div className="absolute scale-[.19]"><AionCharacter stage={state?.stage.key ?? "core"} color={state?.character.energyColor ?? "cyan"} reaction={speaking ? "speaking" : "idle"} disabled /></div>
    {speaking && <motion.span className="absolute inset-1 rounded-xl border border-cyan-300/40" animate={{ opacity: [.2, .8, .2] }} transition={{ duration: .8, repeat: Infinity }} />}
  </div>;
}

export function AionEvolutionPreview() {
  const { state } = useAion();
  const current = state?.stage.key ?? "core";
  return <section className="mt-6 rounded-[26px] border border-cyan-300/10 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,.12),transparent_45%),rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between"><div><p className="text-[9px] uppercase tracking-[.2em] text-cyan-300">Evolution matrix</p><h2 className="mt-1 text-lg font-bold">{state?.stage.name ?? "AION Core"}</h2></div><span className="text-[9px] text-slate-500">LVL {state?.user.level ?? 1}</span></div>
    <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">{AION_STAGES.map(stage => <div key={stage.key} className={`w-24 shrink-0 rounded-2xl border p-3 text-center ${stage.key === current ? "border-cyan-300/30 bg-cyan-300/[.07]" : "border-white/[.06] bg-black/10 opacity-55"}`}><div className="relative mx-auto h-14 w-14 overflow-hidden"><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[.2]"><AionCharacter stage={stage.key} disabled label={`${stage.name} preview`} /></div></div><p className="mt-1 text-[8px] font-bold text-white">{stage.name.replace("AION ", "")}</p><p className="mt-1 text-[7px] text-slate-500">{stage.minLevel === stage.maxLevel ? `LVL ${stage.minLevel}` : `${stage.minLevel}–${stage.maxLevel}`}</p></div>)}</div>
  </section>;
}
