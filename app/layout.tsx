import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://aionex.ai"),
  title: { default: "AIONEX AI | Intelligence, on-chain", template: "%s | AIONEX AI" },
  description: "AIONEX AI connects intelligent tools, community ownership, and transparent infrastructure for the on-chain economy.",
  applicationName: "AIONEX AI",
  keywords: ["AIONEX AI", "Web3", "crypto intelligence", "on-chain analytics", "DeFi"],
  authors: [{ name: "AIONEX AI" }],
  creator: "AIONEX AI",
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "AIONEX AI", title: "AIONEX AI | Intelligence, on-chain", description: "Intelligent tools and transparent infrastructure for the on-chain economy." },
  twitter: { card: "summary", title: "AIONEX AI | Intelligence, on-chain", description: "Intelligent tools and transparent infrastructure for the on-chain economy." },
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
      </body>
    </html>
  );
}
