import assert from "node:assert/strict";
import test from "node:test";
import {evolutionForLevel,seasonRewards,taskClaimIsCurrent,taskClaimKey} from "../lib/aion/rules.ts";

test("daily and cooldown task periods reset deterministically",()=>{const now=new Date("2026-07-19T12:00:00.000Z");assert.equal(taskClaimKey("daily",now),"2026-07-19");assert.equal(taskClaimIsCurrent("daily","2026-07-18",now),false);assert.equal(taskClaimIsCurrent("daily","2026-07-19",now),true);assert.match(taskClaimKey("cooldown",now,24),/^period:/);});
test("season reward configuration rejects malformed milestones",()=>{assert.deepEqual(seasonRewards({milestones:[{key:"bronze",requiredXp:100,axp:50,item:"signal-shard"},{key:"BAD",requiredXp:-1}]}),[{key:"bronze",requiredXp:100,axp:50,item:"signal-shard"}]);});
test("every level produces a stronger deterministic visual evolution",()=>{const one=evolutionForLevel(1),two=evolutionForLevel(2),hundred=evolutionForLevel(100);assert.notDeepEqual(one,two);assert.ok(two.glow>one.glow);assert.ok(hundred.particleCount>two.particleCount);assert.ok(hundred.pulseSeconds<one.pulseSeconds);});
