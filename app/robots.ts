import type { MetadataRoute } from "next";
import { OFFICIAL_LINKS } from "@/lib/social/config";

export default function robots(): MetadataRoute.Robots {
  const base = OFFICIAL_LINKS.website;
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }], sitemap: `${base}/sitemap.xml` };
}
