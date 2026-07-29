"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { chatHref } from "@/components/chat/href";
import { PillRow } from "@/components/chat/PillRow";
import { profile } from "@content/profile";

/**
 * The "Ask me anything…" input from the hero.
 *
 * Submitting doesn't answer here — it navigates to `/chat?query=…`, which does the streaming.
 * The hero is one viewport with a headline in it and no room to grow a conversation, and putting
 * the question in the URL makes every answer linkable.
 *
 * If no model key is configured the route reports that up front and the input renders a
 * disabled, honest offline state instead of sending anyone to a page that can only fail.
 */
export function ChatDock() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);

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

  if (configured === false) {
    return (
      <div className="w-full max-w-xl">
        {/* Deliberately the same pill and the same blue circle as the live form below. When the
            model key is missing this is still the one place to put a question — it just reaches a
            person instead of a model, so it shouldn't announce itself as a different control. */}
        <div className="glass relative flex items-center rounded-full text-left" data-glass>
          <p className="flex-1 py-4 pl-6 pr-14 text-[15px] text-neutral-400">
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
        <p className="mt-2 px-5 text-[12.5px] text-neutral-400">
          Set <code className="font-mono">GOOGLE_GENERATIVE_AI_API_KEY</code> in{" "}
          <code className="font-mono">.env.local</code> to turn it on.
        </p>
        <PillRow className="mt-4" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      {/* The focus ring keeps .glass's dark hairline and just deepens the lift, so focusing the
          input doesn't wipe out the edge the rest of the surface is drawn against. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="glass group relative flex items-center rounded-full focus-within:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.16),0_6px_24px_rgb(0_0_0/0.12)]"
        data-glass
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          aria-label={`Ask ${profile.name} anything`}
          disabled={configured === null}
          className="w-full flex-1 select-text rounded-full bg-transparent py-4 pl-6 pr-14 text-[15px] text-neutral-800 outline-none placeholder:text-neutral-400 disabled:cursor-wait"
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

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {profile.suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => submit(prompt)}
            className="glass rounded-full px-3 py-1.5 text-[12.5px] text-neutral-500 hover:text-neutral-900"
            data-glass
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Below the input so the suggested prompts stay glued to the box they feed. */}
      <PillRow className="mt-4" />
    </div>
  );
}
