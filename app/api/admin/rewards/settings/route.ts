import { getAdminSession } from "@/lib/admin/auth";
import { adminRewardSettings, adminUpdateRewardSettings } from "@/lib/rewards/db";
import { isSameOrigin } from "@/lib/http/request";
export async function GET(){if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});return Response.json({settings:await adminRewardSettings()});}
export async function PATCH(request:Request){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});const admin=await getAdminSession();if(!admin)return Response.json({error:"Unauthorized"},{status:401});try{return Response.json({settings:await adminUpdateRewardSettings(await request.json(),admin.username)});}catch{return Response.json({error:"Invalid reward settings."},{status:400});}}
