"use client";

import { useState } from "react";
import { SolanaControls } from "./solana-controls";
import { WalletControls } from "./wallet-controls";

const links = ["Ecosystem", "Tokenomics", "Roadmap", "FAQ"];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4"><nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-[#060b16]/80 px-3 py-3 shadow-[0_16px_45px_rgba(0,0,0,.2)] backdrop-blur-xl sm:px-5"><a href="#top" className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight" aria-label="AIONEX AI home"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-300 to-blue-600 text-sm text-[#02050b] shadow-[0_0_22px_rgba(20,184,255,.7)]">A</span><span className="hidden sm:inline">AIONEX <em className="not-italic text-cyan-300">AI</em></span></a><div className="hidden items-center gap-5 text-xs text-slate-300 lg:flex">{links.map((link) => <a key={link} href={`#${link.toLowerCase()}`} className="transition hover:text-cyan-300">{link}</a>)}</div><div className="hidden items-center gap-2 md:flex"><SolanaControls /><WalletControls /><a href="/dashboard" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200">Dashboard</a></div><div className="flex items-center gap-2 md:hidden"><WalletControls /><button aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-cyan-200"><span className="text-xl leading-none">{open ? "×" : "☰"}</span></button></div></nav>{open && <div className="mx-auto max-w-7xl rounded-b-2xl border-x border-b border-white/10 bg-[#060b16]/95 px-5 py-4 backdrop-blur-xl md:hidden"><div className="flex flex-col gap-4 text-sm text-slate-200">{links.map((link) => <a onClick={() => setOpen(false)} key={link} href={`#${link.toLowerCase()}`}>{link}</a>)}<a href="/dashboard" className="text-cyan-200">Open dashboard</a><div className="border-t border-white/10 pt-4"><SolanaControls /></div></div></div>}</header>;
}
