import { PostManager } from "@/components/admin/post-manager";
import { getAdminSession } from "@/lib/admin/auth";
import { listPosts } from "@/lib/automation/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function AdminPostsPage() {
  if (!await getAdminSession()) redirect("/admin/login");
  let posts: Awaited<ReturnType<typeof listPosts>> = [], errorMessage = "";
  try { posts = await listPosts(); }
  catch (error) { errorMessage = error instanceof Error ? error.message : "Database unavailable"; }
  return <PostManager initialPosts={posts} initialError={errorMessage} />;
}
