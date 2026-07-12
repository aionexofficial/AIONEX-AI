"use client";

import { useEffect, useRef, useState } from "react";
import { useSolanaAccount } from "@/hooks/use-solana-account";

const compact = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

export function SolanaControls() {
  const wallet = useSolanaAccount();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pending || !wallet.wallet || wallet.connected || wallet.connecting) return;
    wallet.connect().finally(() => setPending(false));
  }, [pending, wallet]);

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function connect() {
    const phantom = wallet.wallets[0];
    if (!phantom) return;
    wallet.select(phantom.adapter.name);
    setPending(true);
  }

  const address = wallet.publicKey?.toBase58();
  if (!wallet.connected || !address) return <button type="button" onClick={connect} disabled={wallet.connecting || pending} className="rounded-xl border border-violet-300/20 bg-violet-300/[.07] px-3 py-2 text-xs font-semibold text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-300/[.12] disabled:opacity-50"><span className="sm:hidden">SOL</span><span className="hidden sm:inline">Connect Solana</span></button>;

  return <div className="relative" ref={menuRef}><button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/[.07] px-3 py-2 text-xs text-violet-100"><span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_8px_#c4b5fd]" /><span className="hidden sm:inline">{compact(address)}</span><span className="text-slate-500">⌄</span></button>{open && <div className="absolute right-0 top-[calc(100%+.65rem)] z-[70] w-72 rounded-2xl border border-violet-200/15 bg-[#07101d]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,.6)] backdrop-blur-2xl"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-300/10 text-sm font-bold text-violet-200">SOL</div><div className="min-w-0"><p className="text-xs font-semibold text-white">Phantom · Solana</p><p className="mt-1 truncate font-mono text-[10px] text-slate-500">{address}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/[.07] p-3"><p className="text-[9px] uppercase tracking-wider text-slate-600">Network</p><p className="mt-1 text-xs text-slate-300">Mainnet</p></div><div className="rounded-xl border border-white/[.07] p-3"><p className="text-[9px] uppercase tracking-wider text-slate-600">Balance</p><p className="mt-1 truncate text-xs text-slate-300">{wallet.balance === null ? "—" : `${wallet.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`}</p></div></div><button type="button" onClick={() => wallet.disconnect().then(() => setOpen(false))} className="mt-3 w-full rounded-lg border border-rose-300/10 py-2 text-xs text-rose-300 transition hover:bg-rose-300/[.06]">Disconnect Solana</button></div>}</div>;
}
