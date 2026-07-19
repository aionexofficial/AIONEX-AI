import { refreshDailyTasks } from "@/lib/rewards/daily-tasks";
import { logError, logInfo } from "@/lib/observability/logger";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await refreshDailyTasks({ source: "vercel-cron", notify: true });
    logInfo("cron.daily-tasks", { period: result.period, tasks: result.tasks, notificationSent: result.notificationSent });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError("cron.daily-tasks", error);
    return Response.json({ error: "Daily-task refresh failed. Check structured logs." }, { status: 500 });
  }
}
