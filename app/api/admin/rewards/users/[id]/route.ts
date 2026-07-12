import { getAdminSession } from "@/lib/admin/auth";
import { adminUpdateUser } from "@/lib/rewards/db";
import { isSameOrigin } from "@/lib/http/request";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});const {status}=await request.json() as {status?:"active"|"suspended"|"review"};if(!status||!["active","suspended","review"].includes(status))return Response.json({error:"Invalid status."},{status:400});const user=await adminUpdateUser((await params).id,status);return user?Response.json({user}):Response.json({error:"User not found."},{status:404});}
