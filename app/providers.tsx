"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { walletConfig } from "@/lib/wallet/config";
import { SolanaProvider } from "@/components/wallet/solana-provider";

const theme = darkTheme({
  accentColor: "#67e8f9",
  accentColorForeground: "#020617",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
});

theme.colors.modalBackground = "#060c17";
theme.colors.modalBorder = "rgba(103, 232, 249, 0.18)";
theme.colors.profileForeground = "#08111f";
theme.colors.menuItemBackground = "rgba(103, 232, 249, 0.07)";
theme.shadows.dialog = "0 30px 100px rgba(0, 0, 0, 0.65), 0 0 60px rgba(34, 211, 238, 0.08)";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } },
  }));

  return (
    <WagmiProvider config={walletConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme} modalSize="compact" initialChain={1}>
          <SolanaProvider>{children}</SolanaProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
