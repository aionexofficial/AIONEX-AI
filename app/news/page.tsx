import { AppShell } from "../components/app-shell";
import { listPosts } from "@/lib/automation/db";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Web3 News", description: "Daily crypto and Web3 intelligence from AIONEX AI.", alternates: { canonical: "/news" } };

export const dynamic = "force-dynamic";
export default async function News() {
  let posts = [] as Awaited<ReturnType<typeof listPosts>>;
  let unavailable = false;
  try { posts = await listPosts(true); } catch { unavailable = true; }
  return <AppShell eyebrow="AIONEX NEWSWIRE" title="Signals worth knowing."><div className="mt-10 space-y-6">{unavailable && <section className="dashboard-card p-6 text-sm text-amber-200">The publishing database is not configured yet.</section>}{!unavailable && posts.length === 0 && <section className="dashboard-card p-6 text-sm text-slate-400">The first daily Web3 brief is being prepared.</section>}{posts.map((post) => <article id={post.slug} key={post.id} className="dashboard-card p-6 sm:p-8"><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-300">AIONEX DAILY · {new Date(post.publishedAt || post.createdAt).toLocaleDateString("en", { dateStyle: "long" })}</div><h2 className="mt-3 text-2xl font-semibold text-white">{post.title}</h2><p className="mt-3 text-sm leading-7 text-cyan-100/70">{post.excerpt}</p><div className="mt-6 space-y-4 text-sm leading-7 text-slate-400">{post.body.split(/\n\s*\n/).map((paragraph, index) => paragraph.startsWith("#") ? <h3 key={index} className="pt-2 text-lg font-semibold text-slate-100">{paragraph.replace(/^#+\s*/, "")}</h3> : <p key={index}>{paragraph}</p>)}</div></article>)}</div></AppShell>;
}
