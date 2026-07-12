import Link from "next/link";
import { SocialButtons } from "@/components/social/social-buttons";
import { OFFICIAL_LINKS } from "@/lib/social/config";
export function Footer(){return <footer className="border-t border-white/10 bg-black/20 px-6 py-10"><div className="mx-auto flex max-w-6xl flex-col gap-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div><Link href={OFFICIAL_LINKS.website} className="font-bold tracking-tight text-white">AIONEX <span className="text-cyan-300">AI</span></Link><p className="mt-1">Intelligence, on-chain.</p></div><div><p className="mb-3 text-xs uppercase tracking-[.18em]">Join the official network</p><SocialButtons/></div><p className="text-xs">© 2026 AIONEX AI. All rights reserved.</p></div></footer>}
