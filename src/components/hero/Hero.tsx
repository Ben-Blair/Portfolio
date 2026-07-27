import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ChatDock } from "@/components/hero/ChatDock";
import { FluidCanvas } from "@/components/hero/FluidCanvas";
import { profile } from "@content/profile";
import { resume } from "@content/resume";

/**
 * The landing screen: fluid background, avatar, headline, chat input, pill row, and a giant
 * faded wordmark bleeding off the bottom edge.
 *
 * `min-h-[100svh]` rather than `100vh` so mobile browser chrome doesn't cause the pills to
 * sit below the fold.
 */
export function Hero() {
  return (
    // select-none: dragging across the hero is how you play with the fluid, and without it
    // that drag just smears a text selection over the headline. The chat panel and input
    // opt back in via select-text.
    <section className="relative isolate flex min-h-[100svh] select-none flex-col items-center justify-center overflow-hidden px-5 pb-24 pt-10">
      <FluidCanvas />

      {/* Wordmark, behind everything, clipped by the section. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-[6vw] left-1/2 -z-[5] w-full -translate-x-1/2 select-none text-center font-display text-[26vw] font-extrabold leading-none tracking-tighter text-neutral-900/[0.045]"
      >
        {profile.wordmark}
      </span>

      <Link
        href="/resume"
        className="absolute left-5 top-5 z-10 hidden items-center gap-2 rounded-full border border-neutral-200/80 bg-white/70 py-2 pl-4 pr-3 text-[13px] font-medium text-neutral-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all hover:border-neutral-300 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] sm:flex"
      >
        Resume · updated {resume.updated}
        <ArrowRight className="size-3.5 text-neutral-400" />
      </Link>

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <p className="font-display text-xl font-bold tracking-tight text-neutral-800 sm:text-2xl">
          {profile.greeting} <span className="inline-block">👋</span>
        </p>

        <h1 className="mt-1 font-display text-[clamp(2.75rem,10vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-neutral-900">
          {profile.headline}
        </h1>

        <div className="relative my-8 size-40 sm:size-48">
          <Image
            src={profile.avatar}
            alt={profile.fullName}
            fill
            sizes="192px"
            priority
            className="object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.10)]"
          />
        </div>

        <ChatDock />
      </div>
    </section>
  );
}
