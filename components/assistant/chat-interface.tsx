"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { Message } from "./message";

const prompts = [
  ["✦", "What is AIONEX AI?"],
  ["◫", "Explain Tokenomics"],
  ["↗", "Show Roadmap"],
  ["◇", "How does staking work?"],
  ["◎", "Explain governance"],
  ["⬡", "Explain marketplace"],
  ["⌁", "Latest crypto market news"],
  ["∆", "AI blockchain trends"],
] as const;

export function ChatInterface() {
  const { messages, isLoading, error, sendMessage, regenerate, clearChat, stop } = useAssistantChat();
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);
  useEffect(() => {
    const area = textareaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 144)}px`;
  }, [input]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!input.trim()) return;
    void sendMessage(input);
    setInput("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
  };
  const choosePrompt = (prompt: string) => { setInput(""); void sendMessage(prompt); };
  const userMessages = messages.filter((message) => message.role === "user");

  return (
    <section className="relative mt-8 overflow-hidden rounded-2xl border border-cyan-100/10 bg-[#050b15]/80 shadow-[0_24px_90px_rgba(0,0,0,.35)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,.09),transparent_65%)]" />
      <header className="relative flex h-14 items-center justify-between border-b border-white/[.07] px-4 sm:px-5">
        <div className="flex items-center gap-3"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span><div><p className="text-xs font-semibold text-slate-200">AIONEX Copilot</p><p className="text-[10px] text-slate-500">Ecosystem intelligence online</p></div></div>
        <div className="flex items-center gap-1"><button onClick={() => setHistoryOpen((open) => !open)} className="rounded-lg px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white" aria-expanded={historyOpen}>History</button><button onClick={clearChat} className="rounded-lg px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-rose-300">Clear</button></div>
      </header>

      <div className="relative flex min-h-[620px] max-h-[calc(100vh-12rem)]">
        {historyOpen && <><button className="absolute inset-0 z-20 bg-black/45 lg:hidden" onClick={() => setHistoryOpen(false)} aria-label="Close history" /><aside className="absolute inset-y-0 left-0 z-30 w-72 border-r border-white/[.07] bg-[#050b15]/95 p-4 backdrop-blur-xl lg:relative lg:bg-black/10"><div className="mb-4 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Conversation</p><button onClick={() => setHistoryOpen(false)} className="text-slate-500 lg:hidden">×</button></div><div className="space-y-1">{userMessages.length ? userMessages.map((message, index) => <button key={message.id} onClick={() => { document.getElementById(message.id)?.scrollIntoView({ behavior: "smooth" }); setHistoryOpen(false); }} className="w-full truncate rounded-lg px-3 py-2.5 text-left text-xs text-slate-400 transition hover:bg-white/5 hover:text-cyan-100"><span className="mr-2 text-cyan-400/60">{String(index + 1).padStart(2, "0")}</span>{message.content}</button>) : <p className="px-3 py-5 text-xs leading-5 text-slate-600">Your recent prompts will appear here.</p>}</div></aside></>}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="assistant-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8">
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message, index) => <div id={message.id} key={message.id}><Message message={message} canRegenerate={!isLoading && index === messages.length - 1 && message.role === "assistant" && messages.some((item) => item.role === "user")} onRegenerate={() => void regenerate()} /></div>)}
              {isLoading && messages.at(-1)?.content === "" && <div className="flex items-center gap-3 pl-11 text-xs text-slate-500"><span>Analyzing AIONEX intelligence</span><span className="flex gap-1">{[0, 1, 2].map((dot) => <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300" style={{ animationDelay: `${dot * 120}ms` }} />)}</span></div>}
              {error && <div role="alert" className="ml-11 flex items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-3 text-xs text-rose-200"><span>{error}</span><button onClick={() => void regenerate()} className="shrink-0 font-semibold underline underline-offset-4">Try again</button></div>}
              {messages.length === 1 && <div className="grid gap-2 pt-2 sm:grid-cols-2">{prompts.map(([icon, prompt]) => <button key={prompt} onClick={() => choosePrompt(prompt)} className="group flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3.5 text-left text-xs text-slate-400 transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-cyan-300/[.05] hover:text-cyan-50"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-300/[.08] text-sm text-cyan-300 transition group-hover:bg-cyan-300/[.14]">{icon}</span>{prompt}</button>)}</div>}
              <div ref={endRef} />
            </div>
          </div>

          <div className="border-t border-white/[.07] bg-[#050b15]/85 p-3 sm:p-4">
            <form onSubmit={submit} className="mx-auto max-w-3xl"><div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 shadow-inner transition focus-within:border-cyan-300/30 focus-within:ring-2 focus-within:ring-cyan-300/[.05]"><textarea ref={textareaRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} rows={1} maxLength={8000} disabled={isLoading} placeholder="Ask about AIONEX, markets, staking, governance…" className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-slate-600 disabled:opacity-50" />{isLoading ? <button type="button" onClick={stop} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300" aria-label="Stop response"><span className="h-3 w-3 rounded-sm bg-current" /></button> : <button type="submit" disabled={!input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300 text-lg font-semibold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,.2)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Send message">↑</button>}</div><p className="mt-2 text-center text-[10px] text-slate-600">AIONEX Copilot can make mistakes. Verify financial and governance information.</p></form>
          </div>
        </div>
      </div>
    </section>
  );
}
