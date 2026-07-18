import "server-only";

import { neon } from "@neondatabase/serverless";

function db() { if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured."); return neon(process.env.DATABASE_URL); }
export async function adminAionOverview() {
  const [stages, dialogues, risks, transactions] = await Promise.all([
    db()`SELECT * FROM aion_character_stages ORDER BY sort_order`,
    db()`SELECT * FROM aion_dialogues ORDER BY context,priority DESC`,
    db()`SELECT e.id,e.event_type,e.severity,e.details,e.created_at,u.display_name FROM reward_anti_cheat_events e LEFT JOIN reward_users u ON u.id=e.user_id WHERE e.event_type LIKE '%tap%' ORDER BY e.created_at DESC LIMIT 100`,
    db()`SELECT t.id,t.transaction_type,t.axp_delta,t.xp_delta,t.energy_delta,t.created_at,u.display_name FROM aion_economy_transactions t JOIN reward_users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 100`,
  ]);
  return { stages, dialogues, risks, transactions };
}

export async function adminUpdateAionStage(admin: string, input: { key: string; name: string; minLevel: number; maxLevel: number; description: string; enabled: boolean }) {
  if (!/^[a-z0-9_-]{2,32}$/.test(input.key) || input.name.trim().length < 3 || input.name.length > 64 || input.description.trim().length < 3 || input.description.length > 300 || !Number.isInteger(input.minLevel) || !Number.isInteger(input.maxLevel) || input.minLevel < 1 || input.maxLevel < input.minLevel || input.maxLevel > 1_000_000) throw new Error("Invalid stage configuration.");
  const before = await db()`SELECT * FROM aion_character_stages WHERE key=${input.key}`;
  const rows = await db()`UPDATE aion_character_stages s SET name=${input.name.trim()},min_level=${input.minLevel},max_level=${input.maxLevel},description=${input.description.trim()},enabled=${input.enabled},updated_by=${admin},updated_at=NOW()
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
