"use client";

import { useAccount, useBalance, useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";
import { supportedChainIds, type SupportedChainId } from "@/lib/wallet/chains";

export function useWallet() {
  const account = useAccount();
  const isSupported = account.chainId ? supportedChainIds.has(account.chainId) : true;
  const balanceChainId = isSupported ? account.chainId as SupportedChainId | undefined : undefined;
  const ens = useEnsName({ address: account.address, chainId: mainnet.id, query: { enabled: Boolean(account.address) } });
  const balance = useBalance({ address: account.address, chainId: balanceChainId, query: { enabled: Boolean(account.address && balanceChainId) } });

  return {
    ...account,
    ensName: ens.data ?? null,
    balance: balance.data ? `${Number(balance.data.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${balance.data.symbol}` : null,
    isSupported,
    isLoadingDetails: ens.isLoading || balance.isLoading,
  };
}
