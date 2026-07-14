import assert from "node:assert/strict";
import test from "node:test";
import { levelForXp, levelProgress, maximumAcceptedTaps, regeneratedEnergy } from "../lib/aion/economy.ts";
import { stageForLevel } from "../lib/aion/stages.ts";

test("offline energy regeneration is capped and ignores negative clock drift", () => {
  assert.equal(regeneratedEnergy({ current: 20, maximum: 100, lastEnergyAt: 0, now: 60_000, amount: 2, intervalSeconds: 10 }), 32);
  assert.equal(regeneratedEnergy({ current: 90, maximum: 100, lastEnergyAt: 0, now: 600_000, amount: 2, intervalSeconds: 10 }), 100);
  assert.equal(regeneratedEnergy({ current: 20, maximum: 100, lastEnergyAt: 10_000, now: 0, amount: 2, intervalSeconds: 10 }), 20);
});

test("tap batches enforce duration, batch, and integer boundaries", () => {
  assert.equal(maximumAcceptedTaps(50, 1_000, 50, 12), 14);
  assert.equal(maximumAcceptedTaps(8, 1_000, 50, 12), 8);
  assert.equal(maximumAcceptedTaps(500, 60_000, 50, 12), 50);
});

test("level progression and every required AION stage boundary are stable", () => {
  assert.equal(levelForXp(0), 1);
  assert.deepEqual(levelProgress(750), { level: 2, current: 250, required: 500, total: 750 });
  assert.equal(stageForLevel(1).key, "core");
  assert.equal(stageForLevel(6).key, "spark");
  assert.equal(stageForLevel(16).key, "drone");
  assert.equal(stageForLevel(31).key, "guardian");
  assert.equal(stageForLevel(51).key, "quantum");
  assert.equal(stageForLevel(76).key, "ascendant");
  assert.equal(stageForLevel(100).key, "prime");
});
