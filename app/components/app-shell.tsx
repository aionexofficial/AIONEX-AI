"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SolanaControls } from "./solana-controls";
import { WalletControls } from "./wallet-controls";

const nav = [["Home", "/"], ["Dashboard", "/dashboard"], ["Rewards", "/rewards"], ["AI Assistant", "/assistant"], ["Portfolio", "/portfolio"], ["Buy", "/buy"], ["Swap", "/swap"], ["Staking", "/staking"], ["Market", "/market"], ["News", "/news"], ["Settings", "/settings"]];

export function AppShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const path = usePathname();
  return <main className="min-h-screen bg-[#030812] pb-16 text-white md:pb-0">
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#030812]/90 px-3 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} onClick={() => setCollapsed(!collapsed)} className="hidden h-9 w-9 place-items-center rounded-lg border border-white/10 text-cyan-200 md:grid">☰</button><Link href="/" className="truncate font-bold tracking-tight">AIONEX <span className="text-cyan-300">AI</span></Link></div>
      <div className="flex items-center gap-2"><SolanaControls /><WalletControls /></div>
    </header>
    <aside className={`fixed bottom-0 left-0 top-16 z-30 hidden border-r border-white/10 bg-[#050b15]/90 p-3 backdrop-blur-xl transition-all md:block ${collapsed ? "w-16" : "w-60"}`}><nav className="space-y-1">{nav.map(([label, href]) => <Link key={label} href={href} title={label} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${path === href ? "bg-cyan-300/15 text-cyan-100" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span className="grid h-5 w-5 place-items-center text-cyan-300">{label.slice(0, 1)}</span>{!collapsed && label}</Link>)}</nav></aside>
    <div className={`min-h-screen pt-16 transition-[margin] ${collapsed ? "md:ml-16" : "md:ml-60"}`}><div className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-12"><p className="dashboard-kicker">{eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-5xl">{title}</h1><div className="page-enter">{children}</div></div></div>
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/10 bg-[#050b15]/95 p-2 backdrop-blur-xl md:hidden">{nav.slice(0, 5).map(([label, href]) => <Link key={label} href={href} className={`rounded-lg px-2 py-2 text-[10px] ${path === href ? "text-cyan-200" : "text-slate-500"}`}>{label}</Link>)}</nav>
  </main>;
}
