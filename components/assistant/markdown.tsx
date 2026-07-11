import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-cyan-300/10 px-1.5 py-0.5 text-[.9em] text-cyan-200">{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-cyan-300/30 underline-offset-4">{link[1]}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function HighlightedCode({ code }: { code: string }) {
  const tokens = code.split(/(\/\/.*|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\b(?:const|let|var|function|return|async|await|import|export|from|class|new|if|else|type|interface)\b|\b\d+(?:\.\d+)?\b)/g);
  return <>{tokens.map((token, index) => {
    const color = token.startsWith("//") ? "text-slate-500" : /^['"]/.test(token) ? "text-emerald-300" : /^(const|let|var|function|return|async|await|import|export|from|class|new|if|else|type|interface)$/.test(token) ? "text-fuchsia-300" : /^\d/.test(token) ? "text-amber-300" : "text-slate-200";
    return <span key={index} className={color}>{token}</span>;
  })}</>;
}

export function Markdown({ content }: { content: string }) {
  const blocks = content.split(/(```[\s\S]*?```)/g);
  return <div className="space-y-3 text-sm leading-7 text-slate-300">{blocks.map((block, blockIndex) => {
    if (block.startsWith("```")) {
      const match = block.match(/^```([^\n]*)\n?([\s\S]*?)```$/);
      const language = match?.[1].trim() || "code";
      return <div key={blockIndex} className="overflow-hidden rounded-xl border border-white/10 bg-[#02060d]"><div className="border-b border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{language}</div><pre className="overflow-x-auto p-4 text-xs leading-6"><code><HighlightedCode code={match?.[2] ?? block} /></code></pre></div>;
    }
    const lines = block.split("\n");
    return <Fragment key={blockIndex}>{lines.map((line, index) => {
      if (!line.trim()) return <div key={index} className="h-1" />;
      if (line.startsWith("### ")) return <h3 key={index} className="pt-1 text-base font-semibold text-white">{inline(line.slice(4))}</h3>;
      if (line.startsWith("## ")) return <h2 key={index} className="pt-1 text-lg font-semibold text-white">{inline(line.slice(3))}</h2>;
      if (/^[-*] /.test(line)) return <div key={index} className="flex gap-2 pl-1"><span className="text-cyan-300">•</span><span>{inline(line.slice(2))}</span></div>;
      if (/^\d+\. /.test(line)) return <div key={index} className="pl-1">{inline(line)}</div>;
      if (line.startsWith("|")) return <div key={index} className={`grid grid-cols-2 gap-4 border-x border-b border-white/10 px-3 py-1.5 ${line.includes("---") ? "hidden" : ""}`}>{line.split("|").filter(Boolean).map((cell, cellIndex) => <span key={cellIndex}>{inline(cell.trim())}</span>)}</div>;
      return <p key={index}>{inline(line)}</p>;
    })}</Fragment>;
  })}</div>;
}
