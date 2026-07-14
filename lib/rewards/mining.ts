import "server-only";

import { neon } from "@neondatabase/serverless";

const database = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
};

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