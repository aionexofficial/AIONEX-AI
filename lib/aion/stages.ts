export type AionStageKey = "core" | "spark" | "drone" | "guardian" | "quantum" | "ascendant" | "prime";

export type AionStage = {
  key: AionStageKey;
  name: string;
  minLevel: number;
  maxLevel: number;
  description: string;
  rings: number;
  form: AionStageKey;
};

export const AION_STAGES: readonly AionStage[] = [
  { key: "core", name: "AION Core", minLevel: 1, maxLevel: 5, description: "A newly awakened intelligence core.", rings: 1, form: "core" },
  { key: "spark", name: "AION Spark", minLevel: 6, maxLevel: 15, description: "Energy rings and mechanical signals begin to form.", rings: 2, form: "spark" },
  { key: "drone", name: "AION Drone", minLevel: 16, maxLevel: 30, description: "A mobile AI form with propulsion and data trails.", rings: 2, form: "drone" },
  { key: "guardian", name: "AION Guardian", minLevel: 31, maxLevel: 50, description: "An armored intelligence with holographic systems.", rings: 3, form: "guardian" },
  { key: "quantum", name: "AION Quantum", minLevel: 51, maxLevel: 75, description: "A quantum energy body surrounded by data particles.", rings: 4, form: "quantum" },
  { key: "ascendant", name: "AION Ascendant", minLevel: 76, maxLevel: 99, description: "A rare and powerful evolved intelligence.", rings: 5, form: "ascendant" },
  { key: "prime", name: "AION Prime", minLevel: 100, maxLevel: Number.MAX_SAFE_INTEGER, description: "The legendary final form of AION.", rings: 6, form: "prime" },
] as const;

export function stageForLevel(level: number): AionStage {
  const safeLevel = Math.max(1, Math.floor(level));
  return AION_STAGES.find((stage) => safeLevel >= stage.minLevel && safeLevel <= stage.maxLevel) ?? AION_STAGES[0];
}
