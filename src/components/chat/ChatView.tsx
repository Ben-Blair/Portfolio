"use client";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { ArrowRight, Info, Sparkles, Square } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Answer, TypingDots, withoutPartialBold, wordBoundary } from "@/components/chat/Answer";
import { DockShell } from "@/components/chat/DockShell";
import { ErrorLine } from "@/components/chat/ErrorLine";
import { QuestionBubble } from "@/components/chat/QuestionBubble";
import { PANELS } from "@/components/chat/blocks/panels";
import { chatHref } from "@/components/chat/href";
import { PanelAnswer } from "@/components/chat/reveal";
import { PANEL_EXIT_MS, PANEL_THINKING_MS } from "@/components/chat/timing";
import { useReducedMotion } from "@/components/chat/useReducedMotion";
import { useTypewriter } from "@/components/chat/useTypewriter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { profile } from "@content/profile";

/**
 * The last thing `role` said, with its text parts joined — one reply can arrive as several.
 */
function lastText(messages: UIMessage[], role: "user" | "assistant") {
  return (
    messages
      .filter((message) => message.role === role)
      .at(-1)
      ?.parts.map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim() ?? ""
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
  const panelKey = searchParams.get("panel") ?? "";
  const panel = PANELS[panelKey];

  const [input, setInput] = useState("");

  // The written answer's equivalent of waiting on a first token, then clearing the screen for it.
  // Keyed off the panel so moving pill to pill takes both beats again rather than cutting straight
  // to the next answer. Which panel reached each milestone, rather than flags plus a reset: a new
  // panel is simply one neither of these names yet, so switching pills goes back to the dots
  // without a second render.
  const reduced = useReducedMotion();
  const [left, setLeft] = useState("");
  const [answered, setAnswered] = useState("");
  const exiting = Boolean(panelKey) && left === panelKey;
  const answering = Boolean(panelKey) && answered === panelKey;

  useEffect(() => {
    if (!panelKey) return;
    const timer = setTimeout(() => setLeft(panelKey), reduced ? 0 : PANEL_THINKING_MS);
    return () => clearTimeout(timer);
  }, [panelKey, reduced]);

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => setAnswered(panelKey), reduced ? 0 : PANEL_EXIT_MS);
    return () => clearTimeout(timer);
  }, [exiting, panelKey, reduced]);

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

  // Pinned to the question the URL is actually asking. The two go out of step for a render or
  // two — on Back, and between the click and the effect above — and without this the previous
  // answer flashes underneath the new question's bubble before being cleared.
  const answer = lastText(messages, "user") === query ? lastText(messages, "assistant") : "";

  const { typed, tail, typing } = useTypewriter(answer, { active: Boolean(query), done: !busy });

  // Mid-stream the partial-bold guard is doing real work; once there's a tail the answer is
  // whole, its markers are all closed, and the guard has nothing to find.
  const shown = tail ? typed + tail : withoutPartialBold(typed);
  // Nothing typed means no word in progress to let finish, so the fade starts at the top.
  const fadeFrom = tail ? (typed ? wordBoundary(shown, typed.length) : 0) : null;

  // The bubble clears when there's a first character to take its place, rather than when the
  // first token lands — otherwise it makes room for an empty page.
  const started = shown.length > 0;

  return (
    // bg-white rather than the site's PageBackdrop: this page is mostly body copy, and the
    // reference it's built from is plain. Drop the class to put the wash back.
    <div className="relative flex min-h-[100svh] flex-col bg-white">
      <Dialog>
        <DialogTrigger
          aria-label="About this chat"
          className="glass fixed right-4 top-4 z-40 flex size-9 items-center justify-center rounded-full text-neutral-500 hover:text-neutral-900"
          data-glass
          suppressHydrationWarning
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
        {/* `my-auto` centres short content in the gap between the avatar and the input, then
            collapses to normal flow once there's enough of it to need the room.

            Not while a question is on screen, though: the answer is typed out a character at a
            time, and centring it would re-centre on every character, so the text would crawl
            upward the whole time you were reading it. Those start at the top and grow down. */}
        <div className={cn("mx-auto w-full max-w-2xl", !query && !panel && "my-auto")}>
          {panel ? (
            // The same turn a typed question gets: the question asked, a beat, then an answer
            // that arrives a piece at a time. None of it costs a model call.
            <div>
              <QuestionBubble question={panel.question} hidden={exiting || answering} lift />

              {answering ? (
                <PanelAnswer key={panelKey}>
                  <panel.Block />
                </PanelAnswer>
              ) : (
                // The same `1fr → 0fr` close the question is doing above it, so both are out of
                // the layout by the frame the answer mounts. `min-h-0` rather than
                // `overflow-hidden`: the dots leave downward, and clipping them to a row that's
                // shutting would eat the motion that says they left.
                <div
                  aria-hidden="true"
                  className="grid transition-[grid-template-rows] duration-[220ms] ease-in-out motion-reduce:transition-none"
                  style={{ gridTemplateRows: exiting ? "0fr" : "1fr" }}
                >
                  <div className="min-h-0">
                    <TypingDots leaving={exiting} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Decorative, all of it: the bubble repeats what the visitor just typed, and the
                  answer is the same text the live region below carries, only drawn a character
                  at a time. Announcing that character by character would be unusable. */}
              <div aria-hidden="true">
                {query && <QuestionBubble question={query} hidden={started} />}

                {started && <Answer text={shown} fadeFrom={fadeFrom} caret={busy || typing} />}

                {busy && !started && <TypingDots />}
              </div>

              {/* Screen-reader users get told an answer arrived; everyone else watches it type. */}
              <div aria-live="polite" aria-busy={busy}>
                <p className="sr-only">{answer}</p>

                {/* Nothing above it when the model fails before writing anything — the bubble
                    brings its own spacing, and it's still there in that case. */}
                {error && (
                  <div className={cn(started && "mt-6")}>
                    <ErrorLine error={error} />
                  </div>
                )}
              </div>

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

      {/* Sticky rather than fixed so it can't cover the end of a long answer. The wrapper fades to
          transparent instead of laying down an opaque slab: the dock's glass has to have something
          behind it to bend, and a white plate is the one backdrop that makes the material vanish.
          No blur here either — the dock does its own, and blurring twice flattens it. */}
      <div className="sticky bottom-0 z-20 bg-gradient-to-t from-white via-white/85 to-transparent px-5 pb-5 pt-10">
        <div className="mx-auto max-w-2xl">
          {/* Always on screen: the pills are the site's only navigation, so they belong to the
              dock the same way the input does rather than being something you have to open. */}
          <DockShell activePanel={panelKey}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                ask(input);
              }}
              className="relative flex items-center"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask me anything..."
                aria-label={`Ask ${profile.name} anything`}
                className="w-full flex-1 rounded-full bg-transparent py-3.5 pl-4 pr-24 text-[15px] text-neutral-800 outline-none placeholder:text-neutral-600"
              />
              <button
                type="button"
                onClick={() => {
                  // Never re-ask what's already on screen, so the button always changes something.
                  const options = profile.suggestedPrompts.filter((prompt) => prompt !== query);
                  ask(options[Math.floor(Math.random() * options.length)] ?? "");
                }}
                aria-label="Ask me something random"
                className="absolute right-12 flex size-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-neutral-800"
              >
                <Sparkles className="size-4" />
              </button>
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
          </DockShell>
        </div>
      </div>
    </div>
  );
}
