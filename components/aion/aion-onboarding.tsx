"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AionCharacter } from "./aion-character";
import { useAion } from "./aion-provider";

const colors = ["cyan", "violet", "emerald", "amber", "rose", "blue"];
export function AionOnboarding() {
  const { state, setState } = useAion();
  const [step, setStep] = useState(0), [name, setName] = useState("AION"), [username, setUsername] = useState(state?.user.username || ""), [color, setColor] = useState("cyan"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  if (!state || state.character.onboardingCompleted) return null;
  async function finish() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/aion/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterName: name, username, energyColor: color }) });
      const body = await response.json() as { state?: typeof state; error?: string };
      if (!response.ok || !body.state) throw new Error(body.error || "Onboarding could not be saved.");
      setState(body.state);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Onboarding could not be saved."); }
    finally { setBusy(false); }
  }
  return <AnimatePresence><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#01030a]/95 p-5 text-white backdrop-blur-xl">
    <div className="w-full max-w-sm text-center">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-bold uppercase tracking-[.28em] text-cyan-300">Raise Your AI. Shape the Future.</motion.p>
      {step === 0 ? <><div className="mx-auto mt-4 scale-90"><AionCharacter stage="core" color="cyan"/></div><motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .4 }} className="text-2xl font-black">Initializing AION Core...</motion.h1><motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-3 text-sm text-slate-400">Hello... Are you my creator?</motion.p><button onClick={() => setStep(1)} className="mt-8 w-full rounded-2xl bg-cyan-300 py-3.5 text-sm font-black text-slate-950">Awaken AION</button></> : <><div className="mx-auto scale-75"><AionCharacter stage="core" color={color}/></div><h1 className="-mt-6 text-2xl font-black">Shape your AION</h1><div className="mt-5 space-y-3 text-left"><label className="block text-[10px] text-slate-400">Character name<input value={name} maxLength={32} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"/></label><label className="block text-[10px] text-slate-400">Username<input value={username} maxLength={24} onChange={event => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"/></label><div><p className="text-[10px] text-slate-400">Starter energy</p><div className="mt-2 flex justify-between">{colors.map(item => <button aria-label={`${item} energy`} key={item} onClick={() => setColor(item)} className={`h-9 w-9 rounded-full border-2 ${color === item ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: item === "cyan" ? "#22d3ee" : item === "violet" ? "#8b5cf6" : item === "emerald" ? "#34d399" : item === "amber" ? "#fbbf24" : item === "rose" ? "#fb7185" : "#3b82f6" }}/>)}</div></div></div>{error && <p role="alert" className="mt-4 text-xs text-rose-300">{error}</p>}<button disabled={busy || name.trim().length < 2 || username.length < 3} onClick={finish} className="mt-6 w-full rounded-2xl bg-cyan-300 py-3.5 text-sm font-black text-slate-950 disabled:opacity-40">{busy ? "Saving..." : "Meet my AION"}</button></>}
    </div>
  </motion.div></AnimatePresence>;
}
