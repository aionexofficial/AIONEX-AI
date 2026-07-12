import { createPost, findPostForDay } from "@/lib/automation/db";
import { generateDailyPost } from "@/lib/automation/generate";
import { publishPost } from "@/lib/automation/publish";
import { logError } from "@/lib/observability/logger";

export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const day = new Date().toISOString().slice(0, 10);
    let post = await findPostForDay(day);
    if (!post) {
      const generated = await generateDailyPost(day);
      post = await createPost({ ...generated, scheduledFor: day, status: process.env.AUTO_PUBLISH === "false" ? "draft" : "approved" });
    }
    if (process.env.AUTO_PUBLISH !== "false" && post.status !== "published") post = await publishPost(post.id);
    return Response.json({ ok: post?.status === "published" || post?.status === "draft", post });
  } catch (error) {
    logError("cron.daily-post", error);
    return Response.json({ error: "Daily publishing failed. Check the server logs." }, { status: 500 });
  }
}
