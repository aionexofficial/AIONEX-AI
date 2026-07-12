import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { braveWallet, coinbaseWallet, metaMaskWallet, phantomWallet, rabbyWallet, trustWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, createStorage, http } from "wagmi";
import { OFFICIAL_LINKS } from "@/lib/social/config";
import { supportedChains } from "./chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "aionex-development-project-id";

const connectors = connectorsForWallets(
  [{
    groupName: "Recommended",
    wallets: [
      metaMaskWallet,
      rabbyWallet,
      coinbaseWallet,
      phantomWallet,
      braveWallet,
      trustWallet,
      walletConnectWallet,
    ],
  }],
  {
    appName: "AIONEX AI",
    appDescription: "The on-chain intelligence layer",
    appUrl: OFFICIAL_LINKS.website,
    projectId,
  },
);

export const walletConfig = createConfig({
  chains: supportedChains,
  connectors,
  multiInjectedProviderDiscovery: true,
  ssr: true,
  storage: createStorage({ storage: typeof window !== "undefined" ? window.localStorage : undefined }),
  transports: {
    [supportedChains[0].id]: http(),
    [supportedChains[1].id]: http(),
    [supportedChains[2].id]: http(),
    [supportedChains[3].id]: http(),
    [supportedChains[4].id]: http(),
    [supportedChains[5].id]: http(),
  },
});

declare module "wagmi" {
  interface Register { config: typeof walletConfig }
}
