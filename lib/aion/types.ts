import type { AionEconomyConfig } from "./economy";
import type { AionStage } from "./stages";

export type AionState = {
  serverTime: string;
  user: { id: string; username: string | null; displayName: string; axpBalance: number; lifetimeAxp: number; xp: number; level: number; streak: number };
  character: { name: string; energyColor: string; eyeColor: string; aura: string; background: string; profileFrame: string; onboardingCompleted: boolean; totalTaps: number; highestCombo: number };
  energy: { current: number; maximum: number; regenAmount: number; regenIntervalSeconds: number; nextRegenAt: string | null };
  mining: { tapPower: number; criticalChanceBps: number; criticalMultiplierBps: number };
  progression: { currentXp: number; requiredXp: number; totalXp: number; level: number };
  stage: AionStage;
  economy: AionEconomyConfig;
  dialogue: string;
};

export type TapBatchInput = {
  idempotencyKey: string;
  sessionId: string;
  tapCount: number;
  startedAt: string;
  endedAt: string;
  deviceId: string;
};

export type TapBatchResult = {
  batchId: string;
  alreadyProcessed: boolean;
  requestedTaps: number;
  acceptedTaps: number;
  rejectedTaps: number;
  criticalTaps: number;
  rewardAxp: number;
  rewardXp: number;
  energySpent: number;
  energy: number;
  balance: number;
  lifetimeAxp: number;
  xp: number;
  level: number;
  totalTaps: number;
  status: "accepted" | "partial" | "rejected";
  serverTime: string;
};
