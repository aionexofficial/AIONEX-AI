import { getAdminSession } from "@/lib/admin/auth";
import { adminDuplicateTask } from "@/lib/rewards/db";
import { isSameOrigin } from "@/lib/http/request";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});const task=await adminDuplicateTask((await params).id);return task?Response.json({task},{status:201}):Response.json({error:"Task not found."},{status:404});}
