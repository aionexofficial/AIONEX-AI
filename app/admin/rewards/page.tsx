import { redirect } from "next/navigation";
import { RewardsManager } from "@/components/admin/rewards-manager";
import { getAdminSession } from "@/lib/admin/auth";
import { adminListTasks,adminListUsers,adminRewardSettings,adminStats } from "@/lib/rewards/db";
import type { TaskCategory,TaskGroup } from "@/lib/rewards/types";
export const dynamic="force-dynamic";
export default async function AdminRewardsPage(){
 if(!await getAdminSession())redirect("/admin/login");let tasks:Awaited<ReturnType<typeof adminListTasks>>=[],users:Awaited<ReturnType<typeof adminListUsers>>=[],settings:Awaited<ReturnType<typeof adminRewardSettings>>=[];let stats={users:0,axp_earned:0,pending_claims:0,flagged_users:0};
 try{[tasks,users,settings]=await Promise.all([adminListTasks(),adminListUsers(),adminRewardSettings()]);const raw=await adminStats();stats={users:Number(raw.users),axp_earned:Number(raw.axp_earned),pending_claims:Number(raw.pending_claims),flagged_users:Number(raw.flagged_users)};}catch{}
 return <RewardsManager initialTasks={tasks.map(r=>({id:String(r.id),category:r.category as TaskCategory,task_group:r.task_group as TaskGroup,title:String(r.title),description:String(r.description),icon:String(r.icon),reward_axp:Number(r.reward_axp),reward_xp:Number(r.reward_xp),difficulty:String(r.difficulty),enabled:Boolean(r.enabled),repeat_mode:String(r.repeat_mode),cooldown_hours:r.cooldown_hours===null?null:Number(r.cooldown_hours),verification_mode:String(r.verification_mode),verification_config:(r.verification_config||{}) as Record<string,unknown>,task_url:r.task_url?String(r.task_url):null,completion_count:Number(r.completion_count||0)}))} initialUsers={users.map(r=>({id:String(r.id),displayName:String(r.display_name),axp:Number(r.axp_balance),xp:Number(r.xp),level:Number(r.level),status:String(r.status),riskScore:Number(r.risk_score),referrals:Number(r.referrals)}))} initialSettings={Object.fromEntries(settings.map(r=>[String(r.key),Number(r.value)]))} stats={stats}/>;
}
