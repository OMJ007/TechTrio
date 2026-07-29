"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Send, Bot, User, Loader2, Sparkles, StopCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { API_BASE, getToken } from "@/lib/api";
import { Button } from "@/components/ui/Button";

// ── Types ──────────────────────────────────────────────────────────────

const PERSONAS = [
  { value: "warren_buffett", label: "Warren Buffett (Value & Capital)" },
  { value: "ramit_sethi", label: "Ramit Sethi (Rich Life & Automated)" },
  { value: "indian_finance", label: "Indian Tax Advisor (Section 80C & Tax)" },
] as const;

interface Message {
  role: "user" | "assistant";
  text: string;
}

// ── Custom Markdown Components ─────────────────────────────────────────

const markdownComponents = {
  table: ({ children }: any) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-800 bg-surface-950/90 shadow-md">
      <table className="min-w-full divide-y divide-slate-800 text-xs text-slate-200">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-surface-850 font-semibold text-cyan-300 uppercase tracking-wider">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-slate-800/80 bg-surface-900/40">{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="transition-colors hover:bg-surface-800/50">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-3 py-2 text-left text-[11px] font-bold text-brand-300">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="whitespace-normal px-3 py-2 text-xs text-slate-300 font-mono tabular-nums">
      {children}
    </td>
  ),
  h1: ({ children }: any) => (
    <h1 className="mt-3 mb-1.5 border-b border-slate-800 pb-1 text-sm font-bold text-white">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="mt-3 mb-1.5 border-b border-slate-800 pb-1 text-xs font-bold text-white">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wider text-brand-400">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="mb-2 text-xs leading-relaxed text-slate-200 last:mb-0">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="my-2 ml-4 list-disc space-y-1 text-xs text-slate-200">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 text-xs text-slate-200">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-2 rounded-r border-l-2 border-brand-500 bg-surface-850 px-3 py-2 text-xs italic text-slate-300">
      {children}
    </blockquote>
  ),
  code: ({ children }: any) => (
    <code className="rounded bg-surface-800 px-1.5 py-0.5 font-mono text-[11px] text-brand-300">
      {children}
    </code>
  ),
};

// ── Component ──────────────────────────────────────────────────────────

export default function AdvisorChat() {
  const [persona, setPersona] = useState<string>("warren_buffett");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello! I'm your AI Financial Advisor. Ask me anything about your cash flow, budget optimization, tax savings, or long-term investments.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Abort pending stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ── Send message ──────────────────────────────────────────────
  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMsg: Message = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    const token = getToken();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/advisor/chat?stream=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: userMsg.text, persona }),
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail ?? "Chat request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === "chunk" && parsed.text) {
              fullReply += parsed.text;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", text: fullReply };
                return next;
              });
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg =
        err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          text: `Sorry, I encountered an error: ${msg}`,
        };
        return next;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Persona selector ─────────────────────────────────── */}
      <div className="mb-3">
        <label htmlFor="persona" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Advisor Strategy Persona
        </label>
        <select
          id="persona"
          value={persona}
          onChange={(e) => {
            setPersona(e.target.value);
            const label = PERSONAS.find((p) => p.value === e.target.value)?.label;
            setMessages([
              {
                role: "assistant",
                text: `Switched strategy to **${label}**. How can I assist with your financial goals?`,
              },
            ]);
          }}
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-surface-800 px-3 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none cursor-pointer"
        >
          {PERSONAS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Messages ─────────────────────────────────────────── */}
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto pr-1 text-xs"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-600/20 border border-brand-500/30">
                <Bot size={13} className="text-brand-400" />
              </div>
            )}

            <div
              className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-600/25 text-brand-100 border border-brand-500/30"
                  : "bg-surface-850 text-slate-200 border border-slate-800 shadow-sm"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : msg.text ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {msg.text}
                </ReactMarkdown>
              ) : (
                <span className="inline-flex items-center gap-1 py-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:0.3s]" />
                </span>
              )}
            </div>

            {msg.role === "user" && (
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-800 border border-slate-700">
                <User size={13} className="text-slate-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Input ────────────────────────────────────────────── */}
      <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about spending, taxes, budget…"
          disabled={streaming}
          className="flex-1 rounded-lg border border-slate-700 bg-surface-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none disabled:opacity-50"
        />

        {streaming ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleStop}
            title="Stop generating"
          >
            <StopCircle size={14} />
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!input.trim()}
          >
            <Send size={14} />
          </Button>
        )}
      </form>
    </div>
  );
}
