import { arbitrum, base, bsc, mainnet, optimism, polygon } from "wagmi/chains";

export const supportedChains = [mainnet, base, arbitrum, optimism, polygon, bsc] as const;
export const supportedChainIds = new Set<number>(supportedChains.map((chain) => chain.id));

export type SupportedChainId = (typeof supportedChains)[number]["id"];

export const ecosystemCapabilities = {
  staking: supportedChains.map((chain) => chain.id),
  governance: [mainnet.id, base.id, arbitrum.id],
  swap: supportedChains.map((chain) => chain.id),
  marketplace: [mainnet.id, base.id, polygon.id],
  launchpad: [mainnet.id, base.id, bsc.id],
} as const;
