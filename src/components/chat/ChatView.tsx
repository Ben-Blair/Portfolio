"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { ArrowRight, ChevronDown, ChevronUp, Info, Loader2, Sparkles, Square } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ErrorLine } from "@/components/chat/ErrorLine";
import { PillRow } from "@/components/chat/PillRow";
import { PANELS } from "@/components/chat/blocks/panels";
import { chatHref } from "@/components/chat/href";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { profile } from "@content/profile";

/**
 * Blank line separated, the way the system prompt asks the model to write.
 *
 * `**bold**` is the one piece of markdown the prompt allows and the model reliably uses, so it's
 * the one piece parsed here. Everything else stays literal — this is the answer surface, not a
 * document renderer, and a half-supported markdown dialect reads worse than none.
 */
function Answer({ text }: { text: string }) {
  return (
    <div className="space-y-4">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap text-[15px] leading-[1.7] text-neutral-700">
          {paragraph.split(/\*\*(.+?)\*\*/g).map((part, partIndex) =>
            // Odd indexes are what was inside the asterisks.
            partIndex % 2 === 1 ? (
              <strong key={partIndex} className="font-semibold text-neutral-900">
                {part}
              </strong>
            ) : (
              part
            ),
          )}
        </p>
      ))}
    </div>
  );
}

/**
 * The whole `/chat` screen.
 *
 * One question, one answer — not a transcript. What's on screen is whatever the URL says:
 * `?query=` streams an answer from the model, `?panel=` renders a written one. Asking again
 * pushes a new URL rather than appending, which is what makes every answer linkable and the
 * back button do the obvious thing.
 */
export function ChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim() ?? "";
  const panel = PANELS[searchParams.get("panel") ?? ""];

  const [input, setInput] = useState("");
  const [showPills, setShowPills] = useState(true);

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  // Send whatever the URL is asking for, once. The ref is what stops a re-render — or React's
  // double-invoked effects in development — from asking the model the same thing twice.
  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (!query || asked.current === query) return;
    asked.current = query;
    setMessages([]);
    sendMessage({ text: query });
  }, [query, sendMessage, setMessages]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    if (busy) stop();
    setInput("");
    router.push(chatHref(trimmed));
  }

  const answer = messages
    .filter((message) => message.role === "assistant")
    .at(-1)
    ?.parts.map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

  return (
    // bg-white rather than the site's PageBackdrop: this page is mostly body copy, and the
    // reference it's built from is plain. Drop the class to put the wash back.
    <div className="relative flex min-h-[100svh] flex-col bg-white">
      <Dialog>
        <DialogTrigger
          aria-label="About this chat"
          className="glass fixed right-4 top-4 z-40 flex size-9 items-center justify-center rounded-full text-neutral-500 hover:text-neutral-900"
          data-glass
        >
          <Info className="size-4" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About this chat</DialogTitle>
            <DialogDescription>
              You&apos;re talking to a model answering as {profile.name}, from his projects and
              resume. It gets things wrong sometimes — for anything that matters, email{" "}
              <a href={`mailto:${profile.email}`}>{profile.email}</a> and you&apos;ll reach the
              actual person.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 flex-col px-5 pb-10 pt-28 sm:pt-32">
        {/* `my-auto` centres a short answer in the gap between the avatar and the input, the way
            the page reads with one paragraph on it, then collapses to normal flow once the
            content is tall enough to need the room. */}
        <div className="mx-auto my-auto w-full max-w-2xl">
          {panel ? (
            <>
              <h1 className="font-display text-[clamp(1.75rem,5vw,2.25rem)] font-extrabold tracking-[-0.035em] text-neutral-900">
                {panel.title}
              </h1>
              <div className="mt-6">
                <panel.Block />
              </div>
            </>
          ) : (
            /* Screen-reader users get told an answer arrived; everyone else watches it stream. */
            <div aria-live="polite" aria-busy={busy}>
              {answer && <Answer text={answer} />}

              {status === "submitted" && !answer && (
                <p className="flex items-center gap-2 text-[15px] text-neutral-400">
                  <Loader2 className="size-4 animate-spin" />
                  Thinking…
                </p>
              )}

              {error && <ErrorLine error={error} />}

              {!query && !busy && !error && (
                <div>
                  <h1 className="font-display text-[clamp(1.75rem,5vw,2.25rem)] font-extrabold tracking-[-0.035em] text-neutral-900">
                    Ask me anything
                  </h1>
                  <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">
                    I&apos;ll answer as myself. Start with one of these if you like.
                  </p>
                  <ul className="mt-5 space-y-2">
                    {profile.suggestedPrompts.map((prompt) => (
                      <li key={prompt}>
                        <button
                          type="button"
                          onClick={() => ask(prompt)}
                          className="text-left text-[15px] text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
                        >
                          {prompt}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky rather than fixed so it can't cover the end of a long answer. */}
      <div className="sticky bottom-0 z-20 bg-white/85 px-5 pb-5 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-2xl">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowPills((shown) => !shown)}
              aria-expanded={showPills}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[12.5px] text-neutral-400 transition-colors hover:text-neutral-700"
            >
              {showPills ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronUp className="size-3.5" />
              )}
              {showPills ? "Hide quick questions" : "Quick questions"}
            </button>
          </div>

          {showPills && (
            <PillRow
              variant="inline"
              className="mt-2"
              trailing={
                <button
                  type="button"
                  onClick={() => {
                    // Never re-ask what's already on screen, so the button always changes something.
                    const options = profile.suggestedPrompts.filter((prompt) => prompt !== query);
                    ask(options[Math.floor(Math.random() * options.length)] ?? "");
                  }}
                  aria-label="Ask me something random"
                  className="glass flex size-10 items-center justify-center rounded-full text-neutral-500 hover:-translate-y-0.5 hover:text-neutral-900"
                  data-glass
                >
                  <Sparkles className="size-4" />
                </button>
              }
            />
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask(input);
            }}
            className="glass relative mt-3 flex items-center rounded-full focus-within:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.16),0_6px_24px_rgb(0_0_0/0.12)]"
            data-glass
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask me anything..."
              aria-label={`Ask ${profile.name} anything`}
              className="w-full flex-1 rounded-full bg-transparent py-3.5 pl-6 pr-14 text-[15px] text-neutral-800 outline-none placeholder:text-neutral-400"
            />
            <button
              type={busy ? "button" : "submit"}
              onClick={busy ? () => stop() : undefined}
              disabled={!busy && !input.trim()}
              aria-label={busy ? "Stop generating" : "Send"}
              className="absolute right-2 flex size-10 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:bg-[#609cec] disabled:hover:bg-[#609cec]"
            >
              {busy ? (
                <Square className="size-3.5 fill-current" />
              ) : (
                <ArrowRight className="size-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
