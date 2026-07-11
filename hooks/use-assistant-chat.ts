"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatRequest } from "@/types/assistant";

const STORAGE_KEY = "aionex-assistant-history-v1";
const welcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "## Welcome to AIONEX Copilot\n\nI’m your guide to the AIONEX ecosystem, from **tokenomics and staking** to market intelligence, governance, and the roadmap. What would you like to explore?",
  createdAt: new Date(0).toISOString(),
  status: "complete",
};

const id = () => crypto.randomUUID();

export function useAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setMessages(JSON.parse(saved) as ChatMessage[]);
      } catch { localStorage.removeItem(STORAGE_KEY); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (messages.length > 1) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  }, [messages]);

  const streamResponse = useCallback(async (conversation: ChatMessage[]) => {
    const assistantId = id();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setIsLoading(true);
    setMessages([...conversation, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString(), status: "streaming" }]);
    try {
      const body: ChatRequest = { messages: conversation.filter((message) => message.id !== "welcome").map(({ role, content }) => ({ role, content })) };
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? "The assistant is unavailable right now.");
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: message.content + value } : message));
      }
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, status: "complete" } : message));
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, status: "complete" } : message));
      } else {
        const message = reason instanceof Error ? reason.message : "Something went wrong.";
        setError(message);
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: item.content || "I couldn’t complete that response.", status: "error" } : item));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || isLoading) return;
    const userMessage: ChatMessage = { id: id(), role: "user", content: text.slice(0, 8000), createdAt: new Date().toISOString(), status: "complete" };
    await streamResponse([...messages, userMessage]);
  }, [isLoading, messages, streamResponse]);

  const regenerate = useCallback(async () => {
    if (isLoading) return;
    const lastUserIndex = messages.findLastIndex((message) => message.role === "user");
    if (lastUserIndex < 0) return;
    await streamResponse(messages.slice(0, lastUserIndex + 1));
  }, [isLoading, messages, streamResponse]);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    localStorage.removeItem(STORAGE_KEY);
    setMessages([welcome]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, regenerate, clearChat, stop: () => abortRef.current?.abort() };
}
