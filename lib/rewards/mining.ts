import "server-only";

import {
  miningStatus,
  startMiningSession,
  stopMiningSession,
} from "./db";

export type MiningSession = {
  id: string;
  status: string;
  startedAt: string;
  endsAt: string;
  stoppedAt: string | null;
  durationSeconds: number | null;
  awardedAxp: number;
  awardedXp: number;
};

export type MiningStats = {
  claims: number;
  earned: number;
  lastClaim: string | null;
  cooldownHours: number;
};

export type MiningState = {
  stats: MiningStats;
  session: MiningSession | null;
  history: MiningSession[];
  serverTime: string;
};

export async function getMiningState(userId: string): Promise<MiningState> {
  return miningStatus(userId) as Promise<MiningState>;
}

export async function beginMining(userId: string) {
  return startMiningSession(userId);
}

export async function endMining(userId: string) {
  return stopMiningSession(userId);
}
