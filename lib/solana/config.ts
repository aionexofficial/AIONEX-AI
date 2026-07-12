import { clusterApiUrl } from "@solana/web3.js";

export const solanaNetwork = "mainnet-beta" as const;
export const solanaEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(solanaNetwork);
