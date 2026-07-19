import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const read=(path:string)=>readFile(new URL(path,import.meta.url),"utf8");

test("master completion migration is additive and backfills without overwriting users",async()=>{const migration=await read("../db/migrations/018_master_completion.sql");assert.doesNotMatch(migration,/\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i);assert.match(migration,/ON CONFLICT\(user_id\) DO NOTHING/);for(const column of ["referrer_axp","referred_axp","referrer_xp","referred_xp"])assert.match(migration,new RegExp(`ADD COLUMN IF NOT EXISTS ${column}`));for(const table of ["aion_season_reward_claims","aion_season_achievement_claims"])assert.match(migration,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));});

test("all reward paths use configurable leveling and referral XP",async()=>{const rewards=await read("../lib/rewards/db.ts");assert.doesNotMatch(rewards,/FLOOR\(\(u\.xp\+l\.xp_awarded\)\/500\.0\)/);assert.match(rewards,/rewardSetting\("aion_xp_per_level",500\)/);assert.match(rewards,/referrer_xp/);assert.match(rewards,/referred_xp/);});

test("daily tasks evaluate only current-day verified progress",async()=>{const rewards=await read("../lib/rewards/db.ts");assert.match(rewards,/claim_key=CURRENT_DATE::text/);assert.match(rewards,/SUM\(accepted_taps\)>=\$\{required\}/);assert.match(rewards,/aion_referral_events[\s\S]*created_at>=CURRENT_DATE/);});

test("gameplay exposes idempotent chest, prestige, season reward and achievement flows",async()=>{const gameplay=await read("../lib/aion/gameplay.ts"),panel=await read("../components/aion/gameplay-panel.tsx");for(const contract of ["openMysteryChest","prestigeUser","claimSeasonReward","claimSeasonAchievement"])assert.match(gameplay,new RegExp(`function ${contract}`));assert.match(gameplay,/ON CONFLICT DO NOTHING/);for(const route of ["\/api\/aion\/chests","\/api\/aion\/prestige","\/api\/aion\/seasons\/claim"])assert.match(panel,new RegExp(route));});

test("server anti-cheat records partial and rejected tap batches",async()=>{const service=await read("../lib/aion/service.ts");assert.match(service,/tap_batch_rejected/);assert.match(service,/tap_batch_partial/);assert.match(service,/reward_anti_cheat_events/);assert.match(service,/risk_score=LEAST/);});

test("migration checksums are stable across Windows and production line endings",async()=>{const migrator=await read("../scripts/migrate.mjs");assert.match(migrator,/replace\(\/\\r\\n\/g, "\\n"\)/);});

