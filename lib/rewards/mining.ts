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

export type MiningState =