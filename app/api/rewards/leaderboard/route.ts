import { leaderboard } from "@/lib/rewards/db";
export async function GET(){const rows=await leaderboard();return Response.json({leaders:rows.map(row=>({id:String(row.id),displayName:String(row.display_name),lifetimeAxp:Number(row.lifetime_axp),loginStreak:Number(row.login_streak),rank:Number(row.rank)}))},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300"}});}
