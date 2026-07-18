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
  tapRewardPerLevel: number;
  xpPerLevel: number;
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
  defaultMaxEnergy: 1000,
  energyRegenAmount: 1,
  energyRegenIntervalSeconds: 6,
  baseTapPower: 1,
  tapRewardPerLevel: 2,
  xpPerLevel: XP_PER_LEVEL,
  tapXp: 1,
  criticalChanceBps: 500,
  criticalMultiplierBps: 20_000,
};

export function levelForXp(xp: number, xpPerLevel = XP_PER_LEVEL) {
  return 1 + Math.floor(Math.max(0, xp) / Math.max(1, xpPerLevel));
}

export function levelProgress(xp: number, xpPerLevel = XP_PER_LEVEL) {
  const safeXp = Math.max(0, Math.floor(xp));
  const required = Math.max(1, Math.floor(xpPerLevel));
  const level = levelForXp(safeXp, required);
  const levelStartXp = (level - 1) * required;
  return { level, current: safeXp - levelStartXp, required, total: safeXp };
}

export function tapRewardForLevel(level:number,rewardPerLevel=2,permanentBonusBps=0){return Math.max(1,Math.floor(Math.max(1,level)*Math.max(1,rewardPerLevel)*(10_000+Math.max(0,permanentBonusBps))/10_000));}

export function regeneratedEnergy(input: { current: number; maximum: number; lastEnergyAt: number; now: number; amount: number; intervalSeconds: number }) {
  const elapsedSeconds = Math.max(0, Math.floor((input.now - input.lastEnergyAt) / 1000));
  const ticks = Math.floor(elapsedSeconds / Math.max(1, input.intervalSeconds));
  return Math.min(input.maximum, Math.max(0, input.current) + ticks * Math.max(1, input.amount));
}

export function maximumAcceptedTaps(requested: number, durationMs: number, maxBatch: number, maxPerSecond: number) {
  const durationAllowance = Math.floor(Math.max(250, durationMs) / 1000 * maxPerSecond) + 2;
  return Math.max(0, Math.min(Math.floor(requested), maxBatch, durationAllowance));
}
