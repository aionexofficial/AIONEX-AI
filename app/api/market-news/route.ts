export const dynamic = "force-dynamic";

import { logError } from "@/lib/observability/logger";

const clean = (value: string) => value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();

export async function GET() {
  const key = process.env.COINGECKO_API_KEY;
  if (key) {
    try { const response = await fetch("https://pro-api.coingecko.com/api/v3/news?per_page=3&language=en&type=news", { signal: AbortSignal.timeout(5_000), headers: { "x-cg-pro-api-key": key }, next: { revalidate: 60 } }); if (response.ok) { const data = await response.json(); return Response.json({ items: data.map((item: { title: string; source_name: string; url: string }) => ({ title: item.title, source: item.source_name, url: item.url })) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }); } } catch (error) { logError("market-news.coingecko", error); }
  }
  try { const response = await fetch("https://cointelegraph.com/rss", { signal: AbortSignal.timeout(5_000), next: { revalidate: 60 } }); if (!response.ok) throw new Error(`RSS returned ${response.status}`); const xml = await response.text(); const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 3).map((match) => { const content = match[1]; return { title: clean(content.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "Crypto market update"), source: "Cointelegraph", url: clean(content.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "#") }; }); return Response.json({ items }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }); } catch (error) { logError("market-news.rss", error); return Response.json({ items: [{ title: "Live news is reconnecting. Check back shortly.", source: "AIONEX", url: "#" }] }, { headers: { "Cache-Control": "public, s-maxage=30" } }); }
}
