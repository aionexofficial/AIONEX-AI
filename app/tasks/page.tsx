import type { Metadata } from "next";
import { TasksPage } from "@/components/rewards/tasks-page";
import { getProfile,listTasks } from "@/lib/rewards/db";
import { getRewardUserId } from "@/lib/rewards/session";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Social Tasks",description:"Complete AIONEX social, daily, mining, referral, and campaign tasks to earn AXP and XP."};
export default async function Page(){let tasks:Awaited<ReturnType<typeof listTasks>>=[];let profile:Awaited<ReturnType<typeof getProfile>>=null;try{const id=await getRewardUserId();[tasks,profile]=await Promise.all([listTasks(id),id?getProfile(id):null]);}catch{}return <TasksPage initialTasks={tasks} profile={profile}/>;}
