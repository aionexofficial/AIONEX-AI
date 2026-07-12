import { getAdminSession } from "@/lib/admin/auth";
import { adminCreateTask, adminListTasks } from "@/lib/rewards/db";
import { isSameOrigin } from "@/lib/http/request";
import { taskCategories } from "@/lib/rewards/types";
export async function GET(){if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});return Response.json({tasks:await adminListTasks()});}
export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});const body=await request.json();if(!taskCategories.includes(body.category)||!body.title?.trim()||!body.description?.trim()||!Number.isInteger(body.rewardAxp)||body.rewardAxp<1||body.rewardAxp>100000)return Response.json({error:"Invalid task configuration."},{status:400});return Response.json({task:await adminCreateTask({...body,title:body.title.trim(),description:body.description.trim()})},{status:201});}
