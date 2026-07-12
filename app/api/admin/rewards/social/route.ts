import { getAdminSession } from "@/lib/admin/auth";
import { adminCompletedSocialUsers,adminSocialSettings,adminSocialStats,adminUpdateSocialSettings } from "@/lib/rewards/db";
import { isSameOrigin } from "@/lib/http/request";
export async function GET(){if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});const[settings,stats,users]=await Promise.all([adminSocialSettings(),adminSocialStats(),adminCompletedSocialUsers()]);return Response.json({settings,stats,users});}
export async function PATCH(request:Request){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});const admin=await getAdminSession();if(!admin)return Response.json({error:"Unauthorized"},{status:401});try{return Response.json({settings:await adminUpdateSocialSettings(await request.json(),admin.username)});}catch{return Response.json({error:"Invalid social settings."},{status:400});}}
