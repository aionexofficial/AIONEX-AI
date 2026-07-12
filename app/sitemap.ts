import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://aionex.ai";
  const routes = ["", "/assistant", "/buy", "/dashboard", "/governance", "/launchpad", "/market", "/marketplace", "/news", "/portfolio", "/rewards", "/settings", "/staking", "/swap"];
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "/news" ? "daily" : "weekly", priority: route === "" ? 1 : 0.7 }));
}
