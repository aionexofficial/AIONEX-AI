import { logoutUser } from "@/lib/user-auth";import { isSameOrigin } from "@/lib/http/request";
export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});await logoutUser();return Response.json({ok:true})}
