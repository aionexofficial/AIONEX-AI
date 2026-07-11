"use client";

import { useState } from "react";
import type { ChatMessage } from "@/types/assistant";
import { Markdown } from "./markdown";

export function Message({ message, canRegenerate, onRegenerate }: { message: ChatMessage; canRegenerate: boolean; onRegenerate: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  if (message.role === "user") return <div className="flex justify-end"><div className="max-w-[88%] rounded-2xl rounded-br-md border border-cyan-200/20 bg-cyan-300/[.09] px-4 py-3 text-sm leading-6 text-cyan-50 sm:max-w-[75%]">{message.content}</div></div>;
  return <div className="group flex gap-3"><div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-xs font-bold text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,.1)]">AI</div><div className="min-w-0 max-w-3xl flex-1"><div className={`rounded-2xl rounded-tl-md border px-4 py-3.5 sm:px-5 ${message.status === "error" ? "border-rose-400/25 bg-rose-400/5" : "border-white/[.08] bg-white/[.025]"}`}><Markdown content={message.content} />{message.status === "streaming" && <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-full bg-cyan-300 align-middle" />}</div>{message.content && message.status !== "streaming" && <div className="mt-2 flex gap-1 opacity-70 transition group-hover:opacity-100"><button onClick={copy} className="rounded-lg px-2.5 py-1.5 text-[11px] text-slate-500 transition hover:bg-white/5 hover:text-cyan-200" aria-label="Copy response">{copied ? "Copied" : "Copy"}</button>{canRegenerate && <button onClick={onRegenerate} className="rounded-lg px-2.5 py-1.5 text-[11px] text-slate-500 transition hover:bg-white/5 hover:text-cyan-200">↻ Regenerate</button>}</div>}</div></div>;
}
