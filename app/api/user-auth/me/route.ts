import { getUserSession } from "@/lib/user-auth";
export async function GET(){const user=await getUserSession();return user?Response.json({user}):Response.json({error:"Unauthorized"},{status:401})}
