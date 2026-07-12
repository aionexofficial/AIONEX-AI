import { getAdminSession } from "@/lib/admin/auth";
import { adminDeleteTask,adminUpdateTask } from "@/lib/rewards/db";
import { isSameOrigin } from "@/lib/http/request";
import { parseTaskInput } from "../route";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});const input=parseTaskInput(await request.json());if(!input)return Response.json({error:"Invalid task configuration."},{status:400});const task=await adminUpdateTask((await params).id,input);return task?Response.json({task}):Response.json({error:"Task not found."},{status:404});}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});return await adminDeleteTask((await params).id)?Response.json({ok:true}):Response.json({error:"Task not found."},{status:404});}
