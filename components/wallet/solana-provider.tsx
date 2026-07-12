"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useMemo, type ReactNode } from "react";
import { solanaEndpoint } from "@/lib/solana/config";

export function SolanaProvider({ children }: { children: ReactNode }) {
  // Backpack and other modern wallets are added automatically via Wallet Standard.
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network: WalletAdapterNetwork.Mainnet })], []);
  return <ConnectionProvider endpoint={solanaEndpoint}><WalletProvider wallets={wallets} autoConnect>{children}</WalletProvider></ConnectionProvider>;
}
