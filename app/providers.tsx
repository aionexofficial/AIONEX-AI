"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { mainnet, base, arbitrum } from "wagmi/chains";

const config = getDefaultConfig({ appName: "AIONEX AI", projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "aionex-development-project-id", chains: [mainnet, base, arbitrum], ssr: true });
export function Providers({ children }: { children: ReactNode }) { const [client] = useState(() => new QueryClient()); return <WagmiProvider config={config}><QueryClientProvider client={client}><RainbowKitProvider>{children}</RainbowKitProvider></QueryClientProvider></WagmiProvider>; }
