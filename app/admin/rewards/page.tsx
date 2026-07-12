import { redirect } from "next/navigation";
import { RewardsManager } from "@/components/admin/rewards-manager";
import { getAdminSession } from "@/lib/admin/auth";
import { adminListTasks, adminStats } from "@/lib/rewards/db";
import type { TaskCategory } from "@/lib/rewards/types";
export const dynamic="force-dynamic";
export default async function AdminRewardsPage(){if(!await getAdminSession())redirect("/admin/login");let tasks:Awaited<ReturnType<typeof adminListTasks>>=[];let stats={users:0,axp_earned:0,pending_claims:0,flagged_users:0};try{tasks=await adminListTasks();const raw=await adminStats();stats={users:Number(raw.users),axp_earned:Number(raw.axp_earned),pending_claims:Number(raw.pending_claims),flagged_users:Number(raw.flagged_users)};}catch{/* Configuration message is shown through empty state until migration runs. */}return <RewardsManager initialTasks={tasks.map(row=>({id:String(row.id),category:row.category as TaskCategory,title:String(row.title),description:String(row.description),reward_axp:Number(row.reward_axp),enabled:Boolean(row.enabled)}))} stats={stats}/>;}
