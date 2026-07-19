"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { AionStageKey } from "@/lib/aion/stages";
import {evolutionForLevel} from "@/lib/aion/rules";
import {useOptionalAion} from "./aion-provider";

export type AionReaction = "idle" | "tap" | "happy" | "tired" | "level-up" | "speaking";
const stageScale: Record<AionStageKey, number> = { core: .72, spark: .78, drone: .84, guardian: .9, quantum: .96, ascendant: 1.02, prime: 1.08 };

export function AionCharacter({ stage, level, color = "cyan", reaction = "idle", onTap, disabled = false, label = "Tap AION" }: { stage: AionStageKey; level?:number; color?: string; reaction?: AionReaction; onTap?: () => void; disabled?: boolean; label?: string }) {
  const context=useOptionalAion(),reduced = useReducedMotion(), scale = stageScale[stage],evolution=evolutionForLevel(level??context?.state?.user.level??1);
  const tired = reaction === "tired";
  return <motion.button type="button" aria-label={label} disabled={disabled} onPointerDown={onTap}
    whileTap={disabled || reduced ? undefined : { scale: .94 }}
    animate={reduced ? { opacity: tired ? .65 : 1 } : reaction === "tap" ? { scale: [scale, scale * 1.08, scale] } : reaction === "level-up" ? { scale: [scale, scale * 1.16, scale], filter: ["brightness(1)", "brightness(1.7)", "brightness(1)"] } : { y: [0, -5, 0], scale, opacity: tired ? .62 : 1 }}
    transition={reaction === "idle" || reaction === "tired" ? { duration: evolution.pulseSeconds, repeat: Infinity, ease: "easeInOut" } : { duration: .32 }}
    className="aion-character relative grid h-64 w-64 select-none place-items-center rounded-full outline-none disabled:cursor-not-allowed [touch-action:manipulation] [transform:translateZ(0)]"
    style={{ "--aion-color": color } as React.CSSProperties}>
    <motion.span aria-hidden className="absolute inset-4 rounded-full border border-dashed border-cyan-200/25" animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}/>
    <motion.span aria-hidden className="absolute inset-10 rounded-full border border-violet-300/20" animate={reduced ? undefined : { rotate: -360 }} transition={{ duration: 17, repeat: Infinity, ease: "linear" }}/>
    {Array.from({length:evolution.particleCount},(_,index)=><motion.i key={index} aria-hidden className="absolute h-1 w-1 rounded-full bg-cyan-100" style={{left:`${12+(index*37)%76}%`,top:`${10+(index*53)%80}%`,opacity:evolution.glow}} animate={reduced?undefined:{scale:[.5,1.5,.5],opacity:[.15,evolution.glow,.15]}} transition={{duration:1.6+(index%5)*.25,repeat:Infinity,delay:(index%7)*.12}}/>)}
    {stage !== "core" && <span aria-hidden className="absolute left-5 top-1/2 h-10 w-14 -translate-y-1/2 rounded-full border border-cyan-300/20 bg-cyan-300/10 blur-[1px]"/>}
    {(["drone","guardian","quantum","ascendant","prime"] as AionStageKey[]).includes(stage) && <span aria-hidden className="absolute right-5 top-1/2 h-10 w-14 -translate-y-1/2 rounded-full border border-violet-300/20 bg-violet-300/10 blur-[1px]"/>}
    <span aria-hidden className="absolute h-36 w-36 rounded-[42%] border border-white/20 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,.22),transparent_25%),linear-gradient(145deg,rgba(34,211,238,.35),rgba(8,15,35,.96)_48%,rgba(124,58,237,.4))] shadow-[0_0_70px_rgba(34,211,238,.28),inset_0_0_28px_rgba(255,255,255,.08)]"/>
    <span aria-hidden className="absolute flex h-9 w-20 items-center justify-center gap-5 rounded-full border border-cyan-200/20 bg-[#020712]/80 shadow-[0_0_24px_rgba(34,211,238,.18)]">
      <motion.i className="h-2.5 w-3 rounded-full bg-cyan-200 shadow-[0_0_12px_#67e8f9]" animate={reduced ? undefined : { scaleY: [1, 1, .12, 1] }} transition={{ duration: 4.5, repeat: Infinity }}/>
      <motion.i className="h-2.5 w-3 rounded-full bg-cyan-200 shadow-[0_0_12px_#67e8f9]" animate={reduced ? undefined : { scaleY: [1, 1, .12, 1] }} transition={{ duration: 4.5, repeat: Infinity }}/>
    </span>
    <span aria-hidden className="absolute bottom-[54px] h-1.5 w-14 rounded-full bg-cyan-300/40 shadow-[0_0_16px_#22d3ee]"/>
    <span className="absolute -top-1 text-[8px] font-black uppercase tracking-[.24em] text-cyan-100/70">Evolution {evolution.level}</span>
    {stage === "prime" && <span className="absolute top-3 text-[9px] font-black uppercase tracking-[.32em] text-amber-200">Prime</span>}
  </motion.button>;
}
