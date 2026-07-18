export const AION_ECONOMY_VERSION = 1;
export const XP_PER_LEVEL = 500;

export type AionEconomyConfig = {
  version: number;
  earningPaused: boolean;
  maxBatchTaps: number;
  maxTapsPerSecond: number;
  energyCostPerTap: number;
  defaultMaxEnergy: number;
  energyRegenAmount: number;
  energyRegenIntervalSeconds: number;
  baseTapPower: number;
  tapXp: number;
  criticalChanceBps: number;
  criticalMultiplierBps: number;
};

export const DEFAULT_AION_ECONOMY: Readonly<AionEconomyConfig> = {
  version: AION_ECONOMY_VERSION,
  earningPaused: false,
  maxBatchTaps: 50,
  maxTapsPerSecond: 12,
  energyCostPerTap: 1,
  defaultMaxEnergy: 500,
  energyRegenAmount: 1,
  energyRegenIntervalSeconds: 6,
  baseTapPower: 1,
  tapXp: 1,
  criticalChanceBps: 500,
  criticalMultiplierBps: 20_000,
};

export function levelForXp(xp: number) {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

export function levelProgress(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = levelForXp(safeXp);
  const levelStartXp = (level - 1) * XP_PER_LEVEL;
  return { level, current: safeXp - levelStartXp, required: XP_PER_LEVEL, total: safeXp };
}

export function regeneratedEnergy(input: { current: number; maximum: number; lastEnergyAt: number; now: number; amount: number; intervalSeconds: number }) {
  const elapsedSeconds = Math.max(0, Math.floor((input.now - input.lastEnergyAt) / 1000));
  const ticks = Math.floor(elapsedSeconds / Math.max(1, input.intervalSeconds));
  return Math.min(input.maximum, Math.max(0, input.current) + ticks * Math.max(1, input.amount));
}

export function maximumAcceptedTaps(requested: number, durationMs: number, maxBatch: number, maxPerSecond: number) {
  const durationAllowance = Math.floor(Math.max(250, durationMs) / 1000 * maxPerSecond) + 2;
  return Math.max(0, Math.min(Math.floor(requested), maxBatch, durationAllowance));
}
