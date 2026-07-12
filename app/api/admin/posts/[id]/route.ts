import { getAdminSession } from "@/lib/admin/auth";
import { updatePost } from "@/lib/automation/db";
import type { PostStatus } from "@/lib/automation/types";
import { exceedsContentLength, isSameOrigin } from "@/lib/http/request";
import { logError } from "@/lib/observability/logger";

const statuses: PostStatus[] = ["draft", "approved", "failed"];
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (exceedsContentLength(request, 100_000)) return Response.json({ error: "Request is too large." }, { status: 413 });
  try {
    const body = await request.json() as { title?: string; excerpt?: string; body?: string; socialText?: string; status?: PostStatus };
    if (!body.title?.trim() || !body.excerpt?.trim() || !body.body?.trim() || !body.socialText?.trim() || !body.status || !statuses.includes(body.status)) return Response.json({ error: "Complete all fields and select a valid review status." }, { status: 400 });
    if (body.socialText.length > 280) return Response.json({ error: "X text must be 280 characters or fewer." }, { status: 400 });
    const post = await updatePost((await params).id, { title: body.title.trim(), excerpt: body.excerpt.trim(), body: body.body.trim(), socialText: body.socialText.trim(), status: body.status });
    return post ? Response.json({ post }) : Response.json({ error: "Post not found" }, { status: 404 });
  } catch (error) { logError("admin.posts.update", error); return Response.json({ error: "Post update failed." }, { status: 500 }); }
}
