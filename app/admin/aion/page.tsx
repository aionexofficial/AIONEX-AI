import { redirect } from "next/navigation";
import { AionManager } from "@/components/admin/aion-manager";
import { getAdminSession } from "@/lib/admin/auth";
import { adminAionOverview } from "@/lib/aion/admin";

export const dynamic="force-dynamic";
export default async function AdminAionPage(){if(!await getAdminSession())redirect("/admin/login");const data=await adminAionOverview();return <AionManager initial={{stages:data.stages.map(row=>({key:String(row.key),name:String(row.name),min_level:Number(row.min_level),max_level:Number(row.max_level),description:String(row.description),enabled:Boolean(row.enabled)})),dialogues:data.dialogues.map(row=>({key:String(row.key),context:String(row.context),message:String(row.message),enabled:Boolean(row.enabled),priority:Number(row.priority)})),risks:data.risks.map(row=>({id:String(row.id),event_type:String(row.event_type),severity:Number(row.severity),display_name:row.display_name?String(row.display_name):null,created_at:String(row.created_at)})),transactions:data.transactions.map(row=>({id:String(row.id),transaction_type:String(row.transaction_type),axp_delta:Number(row.axp_delta),xp_delta:Number(row.xp_delta),energy_delta:Number(row.energy_delta),display_name:String(row.display_name),created_at:String(row.created_at)}))}}/>}
