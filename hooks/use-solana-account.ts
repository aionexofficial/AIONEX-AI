"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";

export function useSolanaAccount() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (!wallet.publicKey) {
      const timer = window.setTimeout(() => setBalance(null), 0);
      return () => window.clearTimeout(timer);
    }
    connection.getBalance(wallet.publicKey).then((lamports) => {
      if (active) setBalance(lamports / LAMPORTS_PER_SOL);
    }).catch(() => { if (active) setBalance(null); });
    return () => { active = false; };
  }, [connection, wallet.publicKey]);

  return { ...wallet, balance };
}
