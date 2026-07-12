"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDisconnect } from "wagmi";
import { useWallet } from "@/hooks/use-wallet";

const compactAddress = (address?: `0x${string}`) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

export function WalletControls() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const wallet = useWallet();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openChainModal, mounted }) => {
        const ready = mounted && wallet.status !== "reconnecting";
        const connected = ready && account && chain && wallet.isConnected;

        if (!connected) return (
          <button
            type="button"
            onClick={openConnectModal}
            disabled={!ready}
            className="group relative overflow-hidden rounded-xl border border-cyan-200/25 bg-cyan-300/[.09] px-4 py-2 text-xs font-semibold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,.08)] transition hover:border-cyan-200/50 hover:bg-cyan-300/[.16] disabled:cursor-wait disabled:opacity-50 sm:px-5 sm:text-sm"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition duration-700 group-hover:translate-x-full" />
            <span className="relative">Connect Wallet</span>
          </button>
        );

        const unsupported = chain.unsupported || !wallet.isSupported;
        return (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition sm:px-3 ${unsupported ? "border-amber-300/35 bg-amber-300/10 text-amber-100" : "border-cyan-200/20 bg-cyan-300/[.07] text-cyan-50 hover:border-cyan-200/40"}`}
              aria-expanded={open}
            >
              <span className={`h-2 w-2 rounded-full ${unsupported ? "bg-amber-300" : "bg-emerald-300 shadow-[0_0_8px_#6ee7b7]"}`} />
              <span className="hidden max-w-28 truncate sm:inline">{wallet.ensName ?? compactAddress(wallet.address)}</span>
              <span className="text-slate-500">⌄</span>
            </button>

            {open && <div className="absolute right-0 top-[calc(100%+.65rem)] z-[70] w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-cyan-100/15 bg-[#07101d]/95 shadow-[0_24px_80px_rgba(0,0,0,.6),0_0_40px_rgba(34,211,238,.06)] backdrop-blur-2xl">
              <div className="border-b border-white/[.07] p-4">
                <div className="flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-300/25 to-blue-500/15 text-sm font-bold text-cyan-100">{(wallet.ensName ?? wallet.address ?? "0x").slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{wallet.ensName ?? compactAddress(wallet.address)}</p><p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{wallet.address}</p></div></div>
              </div>

              {unsupported && <div className="m-3 rounded-xl border border-amber-300/20 bg-amber-300/[.07] p-3"><p className="text-xs font-semibold text-amber-200">Unsupported network</p><p className="mt-1 text-[11px] leading-5 text-amber-100/60">Switch to Ethereum, Base, Arbitrum, Optimism, Polygon, or BNB Chain.</p></div>}

              <div className="grid grid-cols-2 gap-2 p-3">
                <button type="button" onClick={() => { openChainModal(); setOpen(false); }} className="rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-left transition hover:border-cyan-300/20 hover:bg-cyan-300/[.05]"><span className="block text-[10px] uppercase tracking-wider text-slate-500">Network</span><span className={`mt-1 block truncate text-xs font-medium ${unsupported ? "text-amber-200" : "text-slate-200"}`}>{chain.name}</span></button>
                <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><span className="block text-[10px] uppercase tracking-wider text-slate-500">Balance</span><span className="mt-1 block truncate text-xs font-medium text-slate-200">{wallet.isLoadingDetails ? "Loading…" : wallet.balance ?? "—"}</span></div>
              </div>

              <div className="grid grid-cols-3 gap-1 border-t border-white/[.07] p-3"><Link href="/portfolio" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 text-center text-xs text-cyan-200 transition hover:bg-cyan-300/[.07]">Portfolio</Link><button type="button" onClick={() => navigator.clipboard.writeText(wallet.address ?? "")} className="rounded-lg px-2 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-cyan-200">Copy</button><button type="button" onClick={() => { disconnect(); setOpen(false); }} className="rounded-lg px-2 py-2 text-xs text-rose-300 transition hover:bg-rose-400/10">Disconnect</button></div>
            </div>}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
