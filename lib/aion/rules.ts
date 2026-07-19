export type RepeatMode = "once" | "daily" | "cooldown";

export function taskClaimKey(repeatMode: RepeatMode, now: Date, cooldownHours = 24) {
  if (repeatMode === "daily") return now.toISOString().slice(0, 10);
  if (repeatMode === "cooldown") return `period:${Math.floor(now.getTime() / (Math.max(1, cooldownHours) * 3_600_000))}`;
  return "once";
}

export function taskClaimIsCurrent(repeatMode: RepeatMode, claimKey: string | null, now: Date, cooldownHours = 24) {
  if (!claimKey) return false;
  return claimKey === taskClaimKey(repeatMode, now, cooldownHours);
}

export type SeasonReward = { key: string; requiredXp: number; axp?: number; xp?: number; item?: string; quantity?: number };

export function seasonRewards(config: unknown): SeasonReward[] {
  if (!config || typeof config !== "object" || !Array.isArray((config as { milestones?: unknown }).milestones)) return [];
  return (config as { milestones: unknown[] }).milestones.filter((entry): entry is SeasonReward => {
    if (!entry || typeof entry !== "object") return false;
    const reward = entry as Partial<SeasonReward>;
    return typeof reward.key === "string" && /^[a-z0-9-]{2,64}$/.test(reward.key) && Number.isInteger(reward.requiredXp) && Number(reward.requiredXp) >= 0 &&
      (reward.axp === undefined || (Number.isInteger(reward.axp) && Number(reward.axp) >= 0)) &&
      (reward.xp === undefined || (Number.isInteger(reward.xp) && Number(reward.xp) >= 0)) &&
      (reward.item === undefined || /^[a-z0-9-]{2,64}$/.test(reward.item));
  });
}

export function evolutionForLevel(level: number) {
  const safe = Math.max(1, Math.floor(level));
  return { level: safe, pulseSeconds: Math.max(1.2, 3.2 - Math.min(2, safe / 50)), particleCount: Math.min(24, 4 + Math.floor(safe / 5)), glow: Math.min(1, .25 + safe / 125) };
}
