import "server-only";

import { neon } from "@neondatabase/serverless";

function db() { if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured."); return neon(process.env.DATABASE_URL); }
export async function adminAionOverview() {
  const [stages, dialogues, risks, transactions,chests,seasons] = await Promise.all([
    db()`SELECT * FROM aion_character_stages ORDER BY sort_order`,
    db()`SELECT * FROM aion_dialogues ORDER BY context,priority DESC`,
    db()`SELECT e.id,e.event_type,e.severity,e.details,e.created_at,u.display_name FROM reward_anti_cheat_events e LEFT JOIN reward_users u ON u.id=e.user_id WHERE e.event_type LIKE '%tap%' ORDER BY e.created_at DESC LIMIT 100`,
    db()`SELECT t.id,t.transaction_type,t.axp_delta,t.xp_delta,t.energy_delta,t.created_at,u.display_name FROM aion_economy_transactions t JOIN reward_users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 100`,
    db()`SELECT * FROM aion_mystery_chest_definitions ORDER BY created_at`,
    db()`SELECT * FROM aion_seasons ORDER BY starts_at DESC`,
  ]);
  return { stages, dialogues, risks, transactions,chests,seasons };
}

export async function adminUpdateChest(admin:string,input:{key:string;name:string;enabled:boolean;costAxp:number;rewardPool:unknown}){if(!/^[a-z0-9-]{2,64}$/.test(input.key)||input.name.trim().length<2||input.name.length>80||!Number.isInteger(input.costAxp)||input.costAxp<0||input.costAxp>100000||!Array.isArray(input.rewardPool)||!input.rewardPool.length)throw new Error("Invalid chest configuration.");const rewards=input.rewardPool as Array<Record<string,unknown>>;for(const reward of rewards)if(!["axp","xp","energy","item","skin","special"].includes(String(reward.type))||!Number.isInteger(reward.amount)||Number(reward.amount)<0||!Number.isInteger(reward.weight)||Number(reward.weight)<1)throw new Error("Invalid chest reward pool.");const before=await db()`SELECT * FROM aion_mystery_chest_definitions WHERE key=${input.key}`;const rows=await db()`INSERT INTO aion_mystery_chest_definitions(key,name,enabled,cost_axp,reward_pool,updated_by) VALUES(${input.key},${input.name.trim()},${input.enabled},${input.costAxp},${JSON.stringify(rewards)}::jsonb,${admin}) ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,enabled=EXCLUDED.enabled,cost_axp=EXCLUDED.cost_axp,reward_pool=EXCLUDED.reward_pool,updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING *`;await db()`INSERT INTO aion_admin_audit_logs(admin_username,action,target_type,target_id,before_state,after_state) VALUES(${admin},'upsert_mystery_chest','aion_mystery_chest',${input.key},${JSON.stringify(before[0]||null)}::jsonb,${JSON.stringify(rows[0])}::jsonb)`;return rows[0];}

export async function adminUpdateSeason(admin:string,input:{key:string;name:string;startsAt:string;endsAt:string;enabled:boolean;rewardConfig:unknown;eventConfig:unknown}){const starts=new Date(input.startsAt),ends=new Date(input.endsAt);if(!/^[a-z0-9-]{2,64}$/.test(input.key)||input.name.trim().length<2||input.name.length>80||!Number.isFinite(starts.getTime())||!Number.isFinite(ends.getTime())||ends<=starts)throw new Error("Invalid season configuration.");const rewardConfig=input.rewardConfig&&typeof input.rewardConfig==="object"?input.rewardConfig:{},eventConfig=input.eventConfig&&typeof input.eventConfig==="object"?input.eventConfig:{};const before=await db()`SELECT * FROM aion_seasons WHERE key=${input.key}`;const rows=await db()`INSERT INTO aion_seasons(key,name,starts_at,ends_at,enabled,reward_config,event_config,updated_by) VALUES(${input.key},${input.name.trim()},${starts.toISOString()},${ends.toISOString()},${input.enabled},${JSON.stringify(rewardConfig)}::jsonb,${JSON.stringify(eventConfig)}::jsonb,${admin}) ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,enabled=EXCLUDED.enabled,reward_config=EXCLUDED.reward_config,event_config=EXCLUDED.event_config,updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING *`;await db()`INSERT INTO aion_admin_audit_logs(admin_username,action,target_type,target_id,before_state,after_state) VALUES(${admin},'upsert_season','aion_season',${input.key},${JSON.stringify(before[0]||null)}::jsonb,${JSON.stringify(rows[0])}::jsonb)`;return rows[0];}

export async function adminUpdateAionStage(admin: string, input: { key: string; name: string; minLevel: number; maxLevel: number; description: string; enabled: boolean; visualConfig?:unknown }) {
  if (!/^[a-z0-9_-]{2,32}$/.test(input.key) || input.name.trim().length < 3 || input.name.length > 64 || input.description.trim().length < 3 || input.description.length > 300 || !Number.isInteger(input.minLevel) || !Number.isInteger(input.maxLevel) || input.minLevel < 1 || input.maxLevel < input.minLevel || input.maxLevel > 1_000_000) throw new Error("Invalid stage configuration.");
  const before = await db()`SELECT * FROM aion_character_stages WHERE key=${input.key}`;
  const visualConfig=input.visualConfig&&typeof input.visualConfig==="object"?input.visualConfig:before[0]?.visual_config||{};
  const rows = await db()`UPDATE aion_character_stages s SET name=${input.name.trim()},min_level=${input.minLevel},max_level=${input.maxLevel},description=${input.description.trim()},visual_config=${JSON.stringify(visualConfig)}::jsonb,enabled=${input.enabled},updated_by=${admin},updated_at=NOW()
    WHERE s.key=${input.key} AND NOT EXISTS(SELECT 1 FROM aion_character_stages other WHERE other.key<>s.key AND other.enabled=TRUE AND ${input.enabled}=TRUE AND int4range(other.min_level,other.max_level,'[]') && int4range(${input.minLevel},${input.maxLevel},'[]')) RETURNING *`;
  if (!rows[0]) throw new Error("Stage range overlaps another enabled stage.");
  await db()`INSERT INTO aion_admin_audit_logs(admin_username,action,target_type,target_id,before_state,after_state) VALUES(${admin},'update_character_stage','aion_character_stage',${input.key},${JSON.stringify(before[0] || null)}::jsonb,${JSON.stringify(rows[0])}::jsonb)`;
  return rows[0];
}

export async function adminUpdateAionDialogue(admin: string, input: { key: string; message: string; enabled: boolean; priority: number }) {
  if (!/^[a-z0-9_-]{2,64}$/.test(input.key) || input.message.trim().length < 3 || input.message.length > 500 || !Number.isInteger(input.priority) || input.priority < -100 || input.priority > 100) throw new Error("Invalid dialogue configuration.");
  const before = await db()`SELECT * FROM aion_dialogues WHERE key=${input.key}`;
  const rows = await db()`UPDATE aion_dialogues SET message=${input.message.trim()},enabled=${input.enabled},priority=${input.priority},updated_by=${admin},updated_at=NOW() WHERE key=${input.key} RETURNING *`;
  if (!rows[0]) throw new Error("Dialogue not found.");
  await db()`INSERT INTO aion_admin_audit_logs(admin_username,action,target_type,target_id,before_state,after_state) VALUES(${admin},'update_character_dialogue','aion_dialogue',${input.key},${JSON.stringify(before[0])}::jsonb,${JSON.stringify(rows[0])}::jsonb)`;
  return rows[0];
}
