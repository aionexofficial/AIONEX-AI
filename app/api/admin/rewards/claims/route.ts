import { getAdminSession } from "@/lib/admin/auth";
import { adminListPendingClaims,adminReviewClaim } from "@/lib/rewards/db";
import { isSameOrigin } from "@/lib/http/request";
export async function GET(){if(!await getAdminSession())return Response.json({error:"Unauthorized"},{status:401});return Response.json({claims:await adminListPendingClaims()});}
export async function PATCH(request:Request){if(!isSameOrigin(request))return Response.json({error:"Invalid origin."},{status:403});const admin=await getAdminSession();if(!admin)return Response.json({error:"Unauthorized"},{status:401});const{claimId,decision}=await request.json() as {claimId?:string;decision?:"verified"|"rejected"};if(!claimId||!decision||!["verified","rejected"].includes(decision))return Response.json({error:"Invalid review."},{status:400});const claim=await adminReviewClaim(claimId,decision,admin.username);return claim?Response.json({claim}):Response.json({error:"Pending claim not found."},{status:404});}
