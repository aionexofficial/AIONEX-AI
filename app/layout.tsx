import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OFFICIAL_LINKS } from "@/lib/social/config";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(OFFICIAL_LINKS.website),
  title: { default: "AIONEX AI | Intelligence, on-chain", template: "%s | AIONEX AI" },
  description: "AIONEX AI connects intelligent tools, community ownership, and transparent infrastructure for the on-chain economy.",
  applicationName: "AIONEX AI",
  keywords: ["AIONEX AI", "Web3", "crypto intelligence", "on-chain analytics", "DeFi"],
  authors: [{ name: "AIONEX AI" }],
  creator: "AIONEX AI",
  openGraph: { type: "website", url: "/", siteName: "AIONEX AI", title: "AIONEX AI | Intelligence, on-chain", description: "Intelligent tools and transparent infrastructure for the on-chain economy." },
  twitter: { card: "summary_large_image", site:"@aionexai",creator:"@aionexai",title: "AIONEX AI | Intelligence, on-chain", description: "Intelligent tools and transparent infrastructure for the on-chain economy." },
  alternates:{canonical:OFFICIAL_LINKS.website},
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
