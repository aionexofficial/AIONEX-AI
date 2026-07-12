import type { MetadataRoute } from "next";
import { OFFICIAL_LINKS } from "@/lib/social/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = OFFICIAL_LINKS.website;
  const routes = ["", "/assistant", "/dashboard", "/leaderboard", "/market", "/mining", "/news", "/profile", "/referral", "/rewards", "/settings", "/tasks"];
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "/news" ? "daily" : "weekly", priority: route === "" ? 1 : 0.7 }));
}
