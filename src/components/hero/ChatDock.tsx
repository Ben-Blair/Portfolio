"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DockShell } from "@/components/chat/DockShell";
import { chatHref } from "@/components/chat/href";
import { PillRow } from "@/components/chat/PillRow";
import { cn } from "@/lib/utils";
import { profile } from "@content/profile";

/**
 * The "Ask me anything…" input from the hero.
 *
 * Submitting doesn't answer here — it navigates to `/chat?query=…`, which does the streaming.
 * The hero is one viewport with a headline in it and no room to grow a conversation, and putting
 * the question in the URL makes every answer linkable.
 *
 * `variant="hero"` is the tall version: suggested prompts under the input, stacked pills under
 * those. `variant="bar"` is the sticky bottom bar a content page sits above — the same `DockShell`
 * the chat page renders, so leaving `/chat` for `/projects` doesn't change the furniture: one
 * surface with the pill row inside it, not four suggested questions.
 *
 * If no model key is configured the route reports that up front and the input renders a
 * disabled, honest offline state instead of sending anyone to a page that can only fail.
 */
export function ChatDock({ variant = "hero" }: { variant?: "hero" | "bar" }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || configured === false) return;
    router.push(chatHref(trimmed));
  }

  const bar = variant === "bar";

  /**
   * The bar puts its field on the shell's surface, so the field itself is bare — a second glass
   * layer inside the first would only fight it. The hero's field is the surface.
   */
  const fieldClass = bar
    ? "relative flex items-center"
    : "glass group relative flex items-center rounded-full focus-within:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.16),0_6px_24px_rgb(0_0_0/0.12)]";
  const fieldProps = bar ? {} : { "data-glass": "", suppressHydrationWarning: true };

  if (configured === false) {
    /* Deliberately the same field and the same blue circle as the live form. When the model key
       is missing this is still the one place to put a question — it just reaches a person instead
       of a model, so it shouldn't announce itself as a different control. */
    const offline = (
      <div className={cn(fieldClass, !bar && "text-left")} {...fieldProps}>
        <p
          className={cn(
            "flex-1 text-[15px] text-neutral-400",
            bar ? "py-3.5 pl-4 pr-14" : "py-4 pl-6 pr-14",
          )}
        >
          Chat is offline — email me instead.
        </p>
        <a
          href={`mailto:${profile.email}`}
          aria-label={`Email ${profile.name}`}
          className="absolute right-2 flex size-10 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-700"
        >
          <ArrowRight className="size-4" />
        </a>
      </div>
    );

    return (
      <div className={bar ? "w-full max-w-2xl" : "w-full max-w-xl"}>
        {bar ? <DockShell>{offline}</DockShell> : offline}
        <p className="mt-2 px-5 text-[12.5px] text-neutral-400">
          Set <code className="font-mono">GOOGLE_GENERATIVE_AI_API_KEY</code> in{" "}
          <code className="font-mono">.env.local</code> to turn it on.
        </p>
        {!bar && <PillRow className="mt-4" />}
      </div>
    );
  }

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(input);
      }}
      className={fieldClass}
      {...fieldProps}
    >
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Ask me anything..."
        aria-label={`Ask ${profile.name} anything`}
        disabled={configured === null}
        className={cn(
          "w-full flex-1 select-text rounded-full bg-transparent text-[15px] text-neutral-800 outline-none placeholder:text-neutral-600 disabled:cursor-wait",
          // The bar sits under a page rather than in the middle of the hero, so it matches the
          // chat page's slightly shorter input.
          bar ? "py-3.5 pl-4 pr-14" : "py-4 pl-6 pr-14",
        )}
      />
      {/* Disabled is a lighter blue rather than grey: with nothing typed the button is the main
          thing pointing at the empty input, so it should still read as the action you're meant
          to take, just not yet armed. */}
      <button
        type="submit"
        disabled={configured === null || !input.trim()}
        aria-label="Send"
        className="absolute right-2 flex size-10 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:bg-[#609cec] disabled:hover:bg-[#609cec]"
      >
        <ArrowRight className="size-4" />
      </button>
    </form>
  );

  return (
    <div className={bar ? "w-full max-w-2xl" : "w-full max-w-xl"}>
      {bar ? (
        <DockShell fieldFocused={focused}>{form}</DockShell>
      ) : (
        <>
          {form}

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {profile.suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => submit(prompt)}
                className="glass rounded-full px-3 py-1.5 text-[12.5px] text-neutral-500 hover:text-neutral-900"
                data-glass
                suppressHydrationWarning
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Below the input so the suggested prompts stay glued to the box they feed. */}
          <PillRow className="mt-4" />
        </>
      )}
    </div>
  );
}
