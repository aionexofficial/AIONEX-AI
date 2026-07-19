import { getAdminSession } from "@/lib/admin/auth";
import { isSameOrigin } from "@/lib/http/request";
import { dailyTaskAdminState, refreshDailyTasks, updateDailyTaskTemplate } from "@/lib/rewards/daily-tasks";

export async function GET() {
  if (!await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await dailyTaskAdminState(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { action?: string; notify?: boolean; id?: string; template?: Record<string, unknown> };
    if (body.action === "refresh") return Response.json(await refreshDailyTasks({ source: `admin:${admin.username}`, notify: Boolean(body.notify) }));
    if (body.action === "update-template" && body.id && body.template) return Response.json({ template: await updateDailyTaskTemplate(body.id, body.template, admin.username) });
    return Response.json({ error: "Invalid action." }, { status: 400 });
  } catch {
    return Response.json({ error: "Daily-task operation failed." }, { status: 400 });
  }
}
