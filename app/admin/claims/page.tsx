import { redirect } from "next/navigation";
import { ClaimsManager } from "@/components/admin/claims-manager";
import { getAdminSession } from "@/lib/admin/auth";
import { adminListPendingClaims } from "@/lib/rewards/db";
export const dynamic="force-dynamic";
export default async function Page(){if(!await getAdminSession())redirect("/admin/login");let rows:Awaited<ReturnType<typeof adminListPendingClaims>>=[];try{rows=await adminListPendingClaims();}catch{}return <ClaimsManager initialClaims={rows.map(r=>({id:String(r.id),displayName:String(r.display_name),title:String(r.title),category:String(r.category),rewardAxp:Number(r.reward_axp),rewardXp:Number(r.reward_xp),createdAt:String(r.created_at),evidence:(r.evidence||{}) as Record<string,unknown>}))}/>;}
