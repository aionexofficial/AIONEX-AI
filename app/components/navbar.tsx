"use client";

import { useState } from "react";

const links = ["Ecosystem", "Tokenomics", "Roadmap", "FAQ"];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-[#060b16]/75 px-5 py-3.5 shadow-[0_16px_45px_rgba(0,0,0,.2)] backdrop-blur-xl">
        <a href="#top" className="flex items-center gap-2.5 font-bold tracking-tight" aria-label="AIONEX AI home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-300 to-blue-600 text-sm text-[#02050b] shadow-[0_0_22px_rgba(20,184,255,.7)]">A</span>
          <span>AIONEX <em className="not-italic text-cyan-300">AI</em></span>
        </a>
        <div className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          {links.map((link) => <a key={link} href={`#${link.toLowerCase()}`} className="transition hover:text-cyan-300">{link}</a>)}
        </div>
        <a href="/dashboard" className="hidden rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 md:block">Open dashboard</a>
        <button aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-cyan-200 md:hidden">
          <span className="text-xl leading-none">{open ? "×" : "☰"}</span>
        </button>
      </nav>
      {open && <div className="mx-auto max-w-6xl rounded-b-2xl border-x border-b border-white/10 bg-[#060b16]/95 px-5 py-4 backdrop-blur-xl md:hidden"><div className="flex flex-col gap-4 text-sm text-slate-200">{links.map((link) => <a onClick={() => setOpen(false)} key={link} href={`#${link.toLowerCase()}`}>{link}</a>)}</div></div>}
    </header>
  );
}
