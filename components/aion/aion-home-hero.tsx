"use client";

import { ChevronRight, Zap } from "lucide-react";
import { AionCharacter } from "./aion-character";
import { useAion } from "./aion-provider";

export function AionHomeHero({ onOpen }: { onOpen: () => void }) {
  const { state } = useAion();
  if (!state) return null;
  return <section className="relative overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[radial-gradient(circle_at_78%_40%,rgba(34,211,238,.18),transparent_30%),linear-gradient(135deg,rgba(6,182,212,.12),rgba(124,58,237,.12))] p-5">
    <div className="relative z-10 max-w-[56%]"><p className="text-[8px] font-black uppercase tracking-[.25em] text-cyan-300">{state.stage.name} · Level {state.user.level}</p><h2 className="mt-2 text-2xl font-black leading-none">{state.character.name}</h2><p className="mt-3 text-[10px] leading-4 text-slate-400">{state.dialogue}</p><div className="mt-4 flex items-center gap-2 text-[9px] text-amber-200"><Zap size={12}/> {state.energy.current} / {state.energy.maximum} energy</div><button onClick={onOpen} className="mt-4 inline-flex items-center gap-1 rounded-xl bg-cyan-300 px-4 py-2.5 text-[10px] font-black text-slate-950">Grow AION <ChevronRight size={12}/></button></div>
    <div className="pointer-events-none absolute -right-12 -top-12 scale-[.62]"><AionCharacter stage={state.stage.key} color={state.character.energyColor}/></div>
  </section>;
}
