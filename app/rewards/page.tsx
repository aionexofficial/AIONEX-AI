import type { Metadata } from "next";
import Script from "next/script";
import { RewardsDashboard } from "@/components/rewards/rewards-dashboard";
import { GameplayPanel } from "@/components/aion/gameplay-panel";
import { leaderboard, listTasks } from "@/lib/rewards/db";
import { getProfile } from "@/lib/rewards/db";
import { getRewardUserId } from "@/lib/rewards/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Project AION", description: "Raise your AION, tap to earn AXP, complete verified missions, and evolve your personal AI.", alternates: { canonical: "/rewards" } };
export default async function RewardsPage(){let tasks:Awaited<ReturnType<typeof listTasks>>=[];let leaders:Awaited<ReturnType<typeof leaderboard>>=[];let profile:Awaited<ReturnType<typeof getProfile>>=null;try{const userId=await getRewardUserId();[tasks,leaders,profile]=await Promise.all([listTasks(userId),leaderboard(20),userId?getProfile(userId):null]);}catch{/* UI remains available until DATABASE_URL and migration are configured. */}return <><Script src="https://telegram.org/js/telegram-web-app.js?59" strategy="beforeInteractive"/><RewardsDashboard initialProfile={profile} initialTasks={tasks} initialLeaders={leaders.map(row=>({id:String(row.id),displayName:String(row.display_name),lifetimeAxp:Number(row.lifetime_axp),loginStreak:Number(row.login_streak),rank:Number(row.rank)}))}/>{profile&&<GameplayPanel/>}</>;}
