"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import {
  ArrowRight,
  Briefcase,
  Layers,
  Loader2,
  PartyPopper,
  Smile,
  Square,
  UserSearch,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { profile } from "@content/profile";

/** Icon names usable in `profile.pills`. Add to both sides to add a new one. */
const PILL_ICONS: Record<string, LucideIcon> = {
  smile: Smile,
  briefcase: Briefcase,
  layers: Layers,
  party: PartyPopper,
  "user-search": UserSearch,
};

const PILL_CLASS =
  "flex min-w-[92px] flex-col items-center gap-1.5 rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3 text-[13px] font-medium text-neutral-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]";

/**
 * Me / Projects / Skills / Fun / Contact. A pill either navigates (`href`) or asks the chat
 * a question (`prompt`) — see `content/profile.ts`.
 */
function PillRow({ onAsk }: { onAsk: (prompt: string) => void }) {
  return (
    <nav aria-label="Quick links" className="mt-6 flex flex-wrap justify-center gap-2.5">
      {profile.pills.map((pill) => {
        const Icon = PILL_ICONS[pill.icon] ?? Smile;
        const content = (
          <>
            <Icon className="size-[18px] text-neutral-400" strokeWidth={1.75} />
            {pill.label}
          </>
        );

        return "href" in pill && pill.href ? (
          <Link key={pill.label} href={pill.href} className={PILL_CLASS}>
            {content}
          </Link>
        ) : (
          <button
            key={pill.label}
            type="button"
            onClick={() => "prompt" in pill && pill.prompt && onAsk(pill.prompt)}
            className={PILL_CLASS}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * The "Ask me anything…" input from the hero.
 *
 * Streams from /api/chat. If no model key is configured the route reports that up front and
 * the input renders a disabled, honest offline state instead of failing on submit.
 */
export function ChatDock() {
  const [input, setInput] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data: { configured: boolean }) => {
        if (!cancelled) setConfigured(data.configured);
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const busy = status === "submitted" || status === "streaming";
  const hasConversation = messages.length > 0;

  // Keep the newest answer in view as it streams in.
  useEffect(() => {
    if (!hasConversation) return;
    panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, hasConversation]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || configured === false) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  if (configured === false) {
    return (
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white/70 px-5 py-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-sm">
          <p className="flex-1 text-[15px] text-neutral-400">Chat is offline right now.</p>
          <a
            href={`mailto:${profile.email}`}
            className="shrink-0 rounded-full bg-neutral-900 px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Email me
          </a>
        </div>
        <p className="mt-2 px-5 text-[12.5px] text-neutral-400">
          Set <code className="font-mono">GOOGLE_GENERATIVE_AI_API_KEY</code> in{" "}
          <code className="font-mono">.env.local</code> to turn it on.
        </p>
        <PillRow onAsk={() => {}} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="group relative flex items-center rounded-full border border-neutral-200/90 bg-white/80 shadow-[0_2px_14px_rgba(0,0,0,0.05)] backdrop-blur-md transition-shadow focus-within:shadow-[0_4px_24px_rgba(0,0,0,0.09)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          aria-label={`Ask ${profile.name} anything`}
          disabled={configured === null}
          className="w-full flex-1 select-text rounded-full bg-transparent py-4 pl-6 pr-14 text-[15px] text-neutral-800 outline-none placeholder:text-neutral-400 disabled:cursor-wait"
        />
        <button
          type={busy ? "button" : "submit"}
          onClick={busy ? () => stop() : undefined}
          disabled={configured === null || (!busy && !input.trim())}
          aria-label={busy ? "Stop generating" : "Send"}
          className="absolute right-2 flex size-10 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {busy ? <Square className="size-3.5 fill-current" /> : <ArrowRight className="size-4" />}
        </button>
      </form>

      {!hasConversation && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {profile.suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submit(prompt)}
              className="rounded-full border border-neutral-200/80 bg-white/60 px-3 py-1.5 text-[12.5px] text-neutral-500 backdrop-blur-sm transition-colors hover:border-neutral-300 hover:text-neutral-900"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* The pill row lives here rather than in Hero so the prompt pills can drive the chat. */}
      <PillRow onAsk={submit} />

      {hasConversation && (
        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => setMessages([])}
            aria-label="Clear conversation"
            className="absolute -top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full bg-white/80 text-neutral-400 backdrop-blur transition-colors hover:text-neutral-900"
          >
            <X className="size-3.5" />
          </button>

          <div
            ref={panelRef}
            className="max-h-[42vh] select-text space-y-3 overflow-y-auto rounded-3xl border border-neutral-200/80 bg-white/85 p-4 pr-9 text-left shadow-[0_2px_18px_rgba(0,0,0,0.06)] backdrop-blur-md"
          >
            {messages.map((message) => {
              const text = message.parts
                .filter((part) => part.type === "text")
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
              if (!text) return null;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "text-[14.5px] leading-relaxed",
                    message.role === "user"
                      ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-neutral-900 px-3.5 py-2 text-white"
                      : "whitespace-pre-wrap text-neutral-700",
                  )}
                >
                  {text}
                </div>
              );
            })}

            {status === "submitted" && (
              <div className="flex items-center gap-2 text-[14px] text-neutral-400">
                <Loader2 className="size-3.5 animate-spin" />
                Thinking…
              </div>
            )}

            {error && (
              <p className="text-[13.5px] text-red-600">
                Something went wrong. Try again, or email me at{" "}
                <a className="underline" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
                .
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
