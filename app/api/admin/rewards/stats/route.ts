import { getAdminSession } from "@/lib/admin/auth";
import { adminStats } from "@/lib/rewards/db";
export async function GET(){if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});return Response.json({stats:await adminStats()});}
