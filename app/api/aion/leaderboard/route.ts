import { aionLeaderboard, type AionLeaderboardMetric,type AionLeaderboardPeriod } from "@/lib/aion/leaderboard";
import { getRewardUserId } from "@/lib/rewards/session";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url), metric = (url.searchParams.get("metric") || "points") as AionLeaderboardMetric;
  if (!(["points","mining", "weekly_taps","xp", "level", "referrals", "achievements"] as string[]).includes(metric)) return Response.json({ error: "Invalid leaderboard metric." }, { status: 400 });
  const period=(url.searchParams.get("period")||"all") as AionLeaderboardPeriod;if(!(["daily","weekly","monthly","all"] as string[]).includes(period))return Response.json({error:"Invalid leaderboard period."},{status:400});
  const page = Number(url.searchParams.get("page") || 1), limit = Number(url.searchParams.get("limit") || 25);
  return Response.json(await aionLeaderboard(metric, page, limit, await getRewardUserId(),period), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
