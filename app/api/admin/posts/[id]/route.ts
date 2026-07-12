import { getAdminSession } from "@/lib/admin/auth";
import { updatePost } from "@/lib/automation/db";
import type { PostStatus } from "@/lib/automation/types";

const statuses: PostStatus[] = ["draft", "approved", "failed"];
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if ((origin && new URL(origin).host !== new URL(request.url).host) || !await getAdminSession()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { title?: string; excerpt?: string; body?: string; socialText?: string; status?: PostStatus };
    if (!body.title?.trim() || !body.excerpt?.trim() || !body.body?.trim() || !body.socialText?.trim() || !body.status || !statuses.includes(body.status)) return Response.json({ error: "Complete all fields and select a valid review status." }, { status: 400 });
    if (body.socialText.length > 280) return Response.json({ error: "X text must be 280 characters or fewer." }, { status: 400 });
    const post = await updatePost((await params).id, { title: body.title.trim(), excerpt: body.excerpt.trim(), body: body.body.trim(), socialText: body.socialText.trim(), status: body.status });
    return post ? Response.json({ post }) : Response.json({ error: "Post not found" }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 500 }); }
}
