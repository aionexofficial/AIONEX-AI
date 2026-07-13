import { usernameAvailable } from "@/lib/user-auth";
export async function GET(request:Request){const username=new URL(request.url).searchParams.get("username")||"";return Response.json({available:await usernameAvailable(username)})}
