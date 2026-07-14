import "server-only";

import { createHmac, randomInt } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { DEFAULT_AION_ECONOMY, levelProgress, maximumAcceptedTaps, type AionEconomyConfig } from "./economy";
import { stageForLevel } from "./stages";
import type { AionState, TapBatchInput, TapBatchResult } from "./types";

const settingMap = {
  aion_economy_version: "version",
  aion_earning_paused: "earningPaused",
  aion_max_batch_taps: "maxBatchTaps",
  aion_max_taps_per_second: "maxTapsPerSecond",
  aion_energy_cost_per_tap: "energyCostPerTap",
  aion_default_max_energy: "defaultMaxEnergy",
  aion_energy_regen_amount: "energyRegenAmount",
  aion_energy_regen_interval_seconds: "energyRegenIntervalSeconds",
  aion_base_tap_power: "baseTapPower",
  aion_tap_xp: "tapXp",
  aion_critical_chance_bps: "criticalChanceBps",
  aion_critical_multiplier_bps: "criticalMultiplierBps",
} as const;

function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(process.env.DATABASE_URL);
}

export async function getAionEconomy(): Promise<AionEconomyConfig> {
  const rows = await db()`SELECT key,value FROM reward_settings WHERE key LIKE 'aion_%'`;
  const config: AionEconomyConfig = { ...DEFAULT_AION_ECONOMY };
  for (const row of rows) {
    const property = settingMap[String(row.key) as keyof typeof settingMap];
    if (!property) continue;
    if (property === "earningPaused") config[property] = Number(row.value) === 1;
    else config[property] = Number(row.value);
  }
  return config;
}

async function ensureProfile(userId: string, config: AionEconomyConfig) {
  await db()`INSERT INTO aion_character_profiles(user_id,current_energy,max_energy,energy_regen_amount,energy_regen_interval_seconds,tap_power,critical_chance_bps,critical_multiplier_bps,economy_version)
    SELECT id,${config.defaultMaxEnergy},${config.defaultMaxEnergy},${config.energyRegenAmount},${config.energyRegenIntervalSeconds},${config.baseTapPower},${config.criticalChanceBps},${config.criticalMultiplierBps},${config.version}
    FROM reward_users WHERE id=${userId}::uuid ON CONFLICT(user_id) DO NOTHING`;
}

export async function getAionState(userId: string): Promise<AionState | null> {
  const config = await getAionEconomy();
  await ensureProfile(userId, config);
  const rows = await db()`UPDATE aion_character_profiles p SET
      current_energy=LEAST(p.max_energy,p.current_energy+(FLOOR(EXTRACT(EPOCH FROM (NOW()-p.last_energy_at))/p.energy_regen_interval_seconds)::int*p.energy_regen_amount)),
      last_energy_at=CASE WHEN p.current_energy>=p.max_energy THEN p.last_energy_at ELSE NOW() END,
      updated_at=NOW()
    FROM reward_users u WHERE p.user_id=${userId}::uuid AND u.id=p.user_id AND u.status='active'
    RETURNING p.*,u.id,u.username,u.display_name,u.axp_balance,u.lifetime_axp,u.xp,u.level,u.login_streak`;
  const row = rows[0];
  if (!row) return null;
  const level = Number(row.level || 1), energy = Number(row.current_energy), maximum = Number(row.max_energy);
  const progress = levelProgress(Number(row.xp || 0));
  const nextRegenAt = energy < maximum ? new Date(Date.now() + Number(row.energy_regen_interval_seconds) * 1000).toISOString() : null;
  return {
    serverTime: new Date().toISOString(),
    user: { id: String(row.id), username: row.username ? String(row.username) : null, displayName: String(row.display_name), axpBalance: Number(row.axp_balance), lifetimeAxp: Number(row.lifetime_axp), xp: Number(row.xp), level, streak: Number(row.login_streak) },
    character: { name: String(row.character_name), energyColor: String(row.energy_color), eyeColor: String(row.eye_color), aura: String(row.aura), background: String(row.background), profileFrame: String(row.profile_frame), onboardingCompleted: Boolean(row.onboarding_completed), totalTaps: Number(row.total_taps), highestCombo: Number(row.highest_combo) },
    energy: { current: energy, maximum, regenAmount: Number(row.energy_regen_amount), regenIntervalSeconds: Number(row.energy_regen_interval_seconds), nextRegenAt },
    mining: { tapPower: Number(row.tap_power), criticalChanceBps: Number(row.critical_chance_bps), criticalMultiplierBps: Number(row.critical_multiplier_bps) },
    progression: { currentXp: progress.current, requiredXp: progress.required, totalXp: progress.total, level: progress.level },
    stage: stageForLevel(level), economy: config,
    dialogue: energy < maximum * 0.15 ? "Energy is low. Let us recharge." : "Welcome back, Creator.",
  };
}

export async function completeAionOnboarding(userId: string, input: { characterName: string; username: string; energyColor: string }) {
  const characterName = input.characterName.replace(/[<>\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 32);
  const username = input.username.trim().toLowerCase();
  const colors = ["cyan", "violet", "emerald", "amber", "rose", "blue"];
  if (characterName.length < 2 || !/^[a-z0-9_]{3,24}$/.test(username) || !colors.includes(input.energyColor)) throw new Error("Invalid AION profile.");
  const config = await getAionEconomy();
  await ensureProfile(userId, config);
  const rows = await db()`WITH updated_user AS (
      UPDATE reward_users u SET username=${username},display_name=CASE WHEN display_name='AIONEX Explorer' THEN ${username} ELSE display_name END,updated_at=NOW()
      WHERE u.id=${userId}::uuid AND u.status='active' AND NOT EXISTS(SELECT 1 FROM reward_users other WHERE LOWER(other.username)=${username} AND other.id<>u.id)
      RETURNING u.id
    ) UPDATE aion_character_profiles p SET character_name=${characterName},energy_color=${input.energyColor},eye_color=${input.energyColor},onboarding_completed=TRUE,updated_at=NOW()
      FROM updated_user u WHERE p.user_id=u.id RETURNING p.user_id`;
  if (!rows[0]) throw new Error("Username is unavailable.");
  return getAionState(userId);
}

function secretHash(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function rowToTapResult(row: Record<string, unknown>, alreadyProcessed: boolean): TapBatchResult {
  return {
    batchId: String(row.id), alreadyProcessed, requestedTaps: Number(row.requested_taps), acceptedTaps: Number(row.accepted_taps), rejectedTaps: Number(row.rejected_taps), criticalTaps: Number(row.critical_taps), rewardAxp: Number(row.reward_axp), rewardXp: Number(row.reward_xp), energySpent: Number(row.energy_spent), energy: Number(row.current_energy), balance: Number(row.axp_balance), lifetimeAxp: Number(row.lifetime_axp), xp: Number(row.xp), level: Number(row.level), totalTaps: Number(row.total_taps), status: String(row.status) as TapBatchResult["status"], serverTime: new Date().toISOString(),
  };
}

export async function submitTapBatch(userId: string, input: TapBatchInput, requestIp: string): Promise<TapBatchResult> {
  const config = await getAionEconomy();
  if (config.earningPaused) throw new Error("AION earning is temporarily paused.");
  if (!/^[A-Za-z0-9:_-]{8,100}$/.test(input.idempotencyKey) || !/^[A-Za-z0-9:_-]{8,100}$/.test(input.sessionId) || !/^[A-Za-z0-9:_-]{8,128}$/.test(input.deviceId)) throw new Error("Invalid tap session.");
  if (!Number.isInteger(input.tapCount) || input.tapCount < 1 || input.tapCount > config.maxBatchTaps) throw new Error("Invalid tap batch.");
  const startedAt = Date.parse(input.startedAt), endedAt = Date.parse(input.endedAt), now = Date.now();
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt || endedAt > now + 30_000 || startedAt < now - 120_000) throw new Error("Invalid tap timestamps.");
  const existing = await db()`SELECT b.*,p.current_energy,u.axp_balance,u.lifetime_axp,u.xp,u.level,p.total_taps FROM aion_tap_batches b JOIN aion_character_profiles p ON p.user_id=b.user_id JOIN reward_users u ON u.id=b.user_id WHERE b.user_id=${userId}::uuid AND b.idempotency_key=${input.idempotencyKey} LIMIT 1`;
  if (existing[0]) return rowToTapResult(existing[0], true);
  await ensureProfile(userId, config);
  const allowedByRate = maximumAcceptedTaps(input.tapCount, endedAt - startedAt, config.maxBatchTaps, config.maxTapsPerSecond);
  const criticalPositions: number[] = [];
  for (let position = 1; position <= input.tapCount; position += 1) if (randomInt(10_000) < config.criticalChanceBps) criticalPositions.push(position);
  const deviceHash = secretHash(`${userId}:${input.deviceId}`), ipHash = requestIp ? secretHash(requestIp) : null;
  const rows = await db()`WITH candidate AS (
      SELECT p.*,u.axp_balance,u.lifetime_axp,u.xp,u.level FROM aion_character_profiles p JOIN reward_users u ON u.id=p.user_id
      WHERE p.user_id=${userId}::uuid AND u.status='active' AND NOT EXISTS(SELECT 1 FROM aion_tap_batches x WHERE x.user_id=p.user_id AND x.idempotency_key=${input.idempotencyKey}) FOR UPDATE OF p,u
    ), effective AS (
      SELECT c.*,LEAST(c.max_energy,c.current_energy+(FLOOR(EXTRACT(EPOCH FROM (NOW()-c.last_energy_at))/c.energy_regen_interval_seconds)::int*c.energy_regen_amount)) AS effective_energy FROM candidate c
    ), calculated AS (
      SELECT e.*,LEAST(${allowedByRate}::int,FLOOR(e.effective_energy::numeric/${config.energyCostPerTap})::int) AS accepted FROM effective e
    ), rewards AS (
      SELECT c.*,(SELECT COUNT(*)::int FROM jsonb_array_elements_text(${JSON.stringify(criticalPositions)}::jsonb) v WHERE v::int<=c.accepted) AS criticals FROM calculated c
    ), inserted AS (
      INSERT INTO aion_tap_batches(user_id,idempotency_key,session_id,device_hash,ip_hash,requested_taps,accepted_taps,rejected_taps,critical_taps,reward_axp,reward_xp,energy_spent,client_started_at,client_ended_at,status,rejection_code,economy_version,metadata)
      SELECT ${userId}::uuid,${input.idempotencyKey},${input.sessionId},${deviceHash},${ipHash},${input.tapCount},r.accepted,${input.tapCount}-r.accepted,r.criticals,
        r.accepted*r.tap_power+r.criticals*r.tap_power*(${config.criticalMultiplierBps}-10000)/10000,r.accepted*${config.tapXp},r.accepted*${config.energyCostPerTap},${input.startedAt}::timestamptz,${input.endedAt}::timestamptz,
        CASE WHEN r.accepted=0 THEN 'rejected' WHEN r.accepted<${input.tapCount} THEN 'partial' ELSE 'accepted' END,
        CASE WHEN r.accepted=0 THEN 'rate_or_energy' WHEN r.accepted<${input.tapCount} THEN 'partial_rate_or_energy' ELSE NULL END,${config.version},jsonb_build_object('allowedByRate',${allowedByRate}::int) FROM rewards r
      ON CONFLICT(user_id,idempotency_key) DO NOTHING RETURNING *
    ), ledger AS (
      INSERT INTO reward_point_ledger(user_id,amount,xp_awarded,reason,reference_type,reference_id,idempotency_key,metadata)
      SELECT user_id,reward_axp,reward_xp,'mining','aion_tap_batch',id,'aion-tap:'||id,jsonb_build_object('acceptedTaps',accepted_taps,'criticalTaps',critical_taps,'economyVersion',economy_version) FROM inserted WHERE accepted_taps>0 RETURNING *
    ), economy AS (
      INSERT INTO aion_economy_transactions(user_id,transaction_type,axp_delta,xp_delta,energy_delta,reference_type,reference_id,idempotency_key,economy_version,metadata)
      SELECT user_id,'tap_batch',reward_axp,reward_xp,-energy_spent,'aion_tap_batch',id,'aion-tap:'||id,economy_version,jsonb_build_object('acceptedTaps',accepted_taps,'criticalTaps',critical_taps) FROM inserted RETURNING *
    ), updated_user AS (
      UPDATE reward_users u SET axp_balance=u.axp_balance+i.reward_axp,lifetime_axp=u.lifetime_axp+i.reward_axp,xp=u.xp+i.reward_xp,level=1+FLOOR((u.xp+i.reward_xp)/500.0)::int,last_mined_at=CASE WHEN i.accepted_taps>0 THEN NOW() ELSE u.last_mined_at END,updated_at=NOW()
      FROM inserted i WHERE u.id=i.user_id RETURNING u.*
    ), updated_profile AS (
      UPDATE aion_character_profiles p SET current_energy=GREATEST(0,r.effective_energy-i.energy_spent),last_energy_at=NOW(),total_taps=p.total_taps+i.accepted_taps,highest_combo=GREATEST(p.highest_combo,i.accepted_taps),economy_version=${config.version},updated_at=NOW()
      FROM inserted i JOIN rewards r ON r.user_id=i.user_id WHERE p.user_id=i.user_id RETURNING p.*
    ) SELECT i.*,u.axp_balance,u.lifetime_axp,u.xp,u.level,p.current_energy,p.total_taps FROM inserted i JOIN updated_user u ON u.id=i.user_id JOIN updated_profile p ON p.user_id=i.user_id`;
  if (!rows[0]) {
    const raced = await db()`SELECT b.*,p.current_energy,u.axp_balance,u.lifetime_axp,u.xp,u.level,p.total_taps FROM aion_tap_batches b JOIN aion_character_profiles p ON p.user_id=b.user_id JOIN reward_users u ON u.id=b.user_id WHERE b.user_id=${userId}::uuid AND b.idempotency_key=${input.idempotencyKey} LIMIT 1`;
    if (raced[0]) return rowToTapResult(raced[0], true);
    throw new Error("Tap batch could not be processed.");
  }
  return rowToTapResult(rows[0], false);
}
