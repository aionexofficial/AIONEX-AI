import "server-only";

import {randomInt} from "node:crypto";
import {neon} from "@neondatabase/serverless";

function db(){if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured.");return neon(process.env.DATABASE_URL);}
async function setting(key:string,fallback:number){const rows=await db()`SELECT value FROM reward_settings WHERE key=${key}`;return rows[0]?Number(rows[0].value):fallback;}
type ChestReward={type:"axp"|"xp"|"energy"|"item"|"skin"|"special";amount:number;item?:string;weight:number};
function selectReward(pool:ChestReward[]){const valid=pool.filter(entry=>entry&&Number.isInteger(entry.amount)&&entry.amount>=0&&Number.isInteger(entry.weight)&&entry.weight>0&&["axp","xp","energy","item","skin","special"].includes(entry.type));const total=valid.reduce((sum,reward)=>sum+reward.weight,0);if(!total)throw new Error("Chest reward pool is invalid.");let roll=randomInt(total);for(const reward of valid){roll-=reward.weight;if(roll<0)return reward;}return valid[valid.length-1];}

export async function gameplayOverview(userId:string){
  const [chests,prestige,seasons]=await Promise.all([
    db()`SELECT c.id,c.key,c.name,c.cost_axp,c.reward_pool,COUNT(o.id) FILTER(WHERE o.user_id=${userId}::uuid AND o.opened_at>=CURRENT_DATE)::int AS opened_today FROM aion_mystery_chest_definitions c LEFT JOIN aion_mystery_chest_opens o ON o.chest_id=c.id WHERE c.enabled=TRUE GROUP BY c.id ORDER BY c.created_at`,
    db()`SELECT COALESCE(p.prestige_count,0) AS prestige_count,COALESCE(p.permanent_bonus_bps,0) AS permanent_bonus_bps,u.level,(SELECT value FROM reward_settings WHERE key='prestige_required_level') AS required_level FROM reward_users u LEFT JOIN aion_prestige_profiles p ON p.user_id=u.id WHERE u.id=${userId}::uuid`,
    db()`SELECT s.id,s.key,s.name,s.starts_at,s.ends_at,s.reward_config,s.event_config,COALESCE(p.season_xp,0) AS season_xp,p.claimed_rewards FROM aion_seasons s LEFT JOIN aion_season_progress p ON p.season_id=s.id AND p.user_id=${userId}::uuid WHERE s.enabled=TRUE AND NOW()>=s.starts_at AND NOW()<s.ends_at ORDER BY s.starts_at DESC`,
  ]);
  return{chests,prestige:prestige[0]||null,seasons,dailyChestLimit:await setting("mystery_chest_daily_limit",3)};
}

export async function openMysteryChest(userId:string,chestKey:string,idempotencyKey:string){
  if(!/^[a-z0-9-]{2,64}$/.test(chestKey)||!/^[A-Za-z0-9:_-]{8,100}$/.test(idempotencyKey))throw new Error("Invalid chest request.");
  const existing=await db()`SELECT * FROM aion_mystery_chest_opens WHERE user_id=${userId}::uuid AND idempotency_key=${idempotencyKey}`;
  if(existing[0])return{...existing[0],alreadyProcessed:true};
  const definitions=await db()`SELECT * FROM aion_mystery_chest_definitions WHERE key=${chestKey} AND enabled=TRUE`;
  if(!definitions[0])throw new Error("Chest is unavailable.");
  const chest=definitions[0],reward=selectReward(chest.reward_pool as ChestReward[]),limit=await setting("mystery_chest_daily_limit",3),xpPerLevel=await setting("aion_xp_per_level",500),item=reward.item||null;
  const rows=await db()`WITH candidate AS (
    SELECT u.id,u.axp_balance FROM reward_users u WHERE u.id=${userId}::uuid AND u.status='active' AND u.axp_balance>=${Number(chest.cost_axp)} AND (SELECT COUNT(*) FROM aion_mystery_chest_opens o WHERE o.user_id=u.id AND o.opened_at>=CURRENT_DATE)<${limit} FOR UPDATE
  ), opened AS (
    INSERT INTO aion_mystery_chest_opens(user_id,chest_id,idempotency_key,reward_type,reward_amount,reward_item,metadata)
    SELECT id,${String(chest.id)}::uuid,${idempotencyKey},${reward.type},${reward.amount},${item},jsonb_build_object('chestKey',${chestKey}) FROM candidate ON CONFLICT(user_id,idempotency_key) DO NOTHING RETURNING *
  ), ledger AS (
    INSERT INTO reward_point_ledger(user_id,amount,xp_awarded,reason,reference_type,reference_id,idempotency_key,metadata)
    SELECT user_id,CASE WHEN reward_type='axp' THEN reward_amount ELSE 0 END,CASE WHEN reward_type='xp' THEN reward_amount ELSE 0 END,'chest','aion_mystery_chest_open',id,'chest:'||id,jsonb_build_object('rewardType',reward_type,'rewardItem',reward_item) FROM opened RETURNING *
  ), updated_user AS (
    UPDATE reward_users u SET axp_balance=u.axp_balance-${Number(chest.cost_axp)}+l.amount,lifetime_axp=u.lifetime_axp+GREATEST(l.amount,0),xp=u.xp+l.xp_awarded,level=1+FLOOR((u.xp+l.xp_awarded)/${xpPerLevel}::numeric)::int,updated_at=NOW() FROM ledger l WHERE u.id=l.user_id RETURNING u.id
  ), energy AS (
    UPDATE aion_character_profiles p SET current_energy=LEAST(max_energy,current_energy+o.reward_amount),updated_at=NOW() FROM opened o WHERE p.user_id=o.user_id AND o.reward_type='energy' RETURNING p.user_id
  ), inventory AS (
    INSERT INTO aion_user_inventory(user_id,item_key,quantity,metadata) SELECT user_id,reward_item,reward_amount,jsonb_build_object('source','mystery_chest') FROM opened WHERE reward_type IN ('item','skin','special') AND reward_item IS NOT NULL ON CONFLICT(user_id,item_key) DO UPDATE SET quantity=aion_user_inventory.quantity+EXCLUDED.quantity,updated_at=NOW() RETURNING user_id
  ) SELECT * FROM opened`;
  if(!rows[0])throw new Error("Chest limit reached, balance is insufficient, or the request is already processing.");
  return{...rows[0],alreadyProcessed:false};
}

export async function prestigeUser(userId:string){
  const required=await setting("prestige_required_level",100),bonus=await setting("prestige_bonus_bps",500);
  const rows=await db()`WITH eligible AS (SELECT id,level,xp FROM reward_users WHERE id=${userId}::uuid AND status='active' AND level>=${required} FOR UPDATE),profile AS (
    INSERT INTO aion_prestige_profiles(user_id,prestige_count,permanent_bonus_bps,last_prestiged_at) SELECT id,1,${bonus},NOW() FROM eligible ON CONFLICT(user_id) DO UPDATE SET prestige_count=aion_prestige_profiles.prestige_count+1,permanent_bonus_bps=aion_prestige_profiles.permanent_bonus_bps+${bonus},last_prestiged_at=NOW(),updated_at=NOW() RETURNING *
  ),history AS (
    INSERT INTO aion_prestige_history(user_id,prestige_number,level_before,xp_before,bonus_bps) SELECT e.id,p.prestige_count,e.level,e.xp,${bonus} FROM eligible e JOIN profile p ON p.user_id=e.id RETURNING id
  ),reset_user AS (UPDATE reward_users u SET xp=0,level=1,updated_at=NOW() FROM eligible e WHERE u.id=e.id RETURNING u.id),reset_character AS (UPDATE aion_character_profiles p SET current_energy=max_energy,total_taps=0,highest_combo=0,updated_at=NOW() FROM eligible e WHERE p.user_id=e.id RETURNING p.user_id) SELECT p.*,e.level AS level_before FROM profile p JOIN eligible e ON e.id=p.user_id`;
  if(!rows[0])throw new Error(`Level ${required} is required to prestige.`);
  return rows[0];
}

export async function seasonLeaderboard(seasonKey:string,limit=50){if(!/^[a-z0-9-]{2,64}$/.test(seasonKey))throw new Error("Invalid season.");return db()`SELECT u.id,u.display_name,p.season_xp,DENSE_RANK() OVER(ORDER BY p.season_xp DESC) AS rank FROM aion_season_progress p JOIN aion_seasons s ON s.id=p.season_id JOIN reward_users u ON u.id=p.user_id WHERE s.key=${seasonKey} AND u.status='active' ORDER BY p.season_xp DESC,u.created_at LIMIT ${Math.max(1,Math.min(100,limit))}`;}
