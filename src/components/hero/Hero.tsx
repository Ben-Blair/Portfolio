import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ChatDock } from "@/components/hero/ChatDock";
import { FluidCanvas } from "@/components/hero/FluidCanvas";
import { FluidTuner } from "@/components/hero/FluidTuner";
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
    //
    // bg-white covers the site-wide PageBackdrop: the fluid's OPACITY was tuned against a white
    // base, and so was the headline's contrast with it.
    <section className="relative isolate flex min-h-[100svh] select-none flex-col items-center justify-center overflow-hidden bg-white px-5 pb-8 pt-10">
      <FluidCanvas />
      {process.env.NODE_ENV === "development" && <FluidTuner />}

      {/* Wordmark, behind everything, clipped by the section. Hidden below `sm:` — at `18vw` on a
          phone-width viewport it's mostly just a pale smudge behind the dock rather than the
          bleeding-off-the-edge typographic gesture it is on a wide screen, and the screen it's on
          is the one with no room to spend on decoration that isn't pulling its weight. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-[4vw] left-1/2 -z-[5] hidden w-full -translate-x-1/2 select-none text-center font-display text-[18vw] font-extrabold leading-none tracking-tighter text-neutral-900/[0.045] sm:block"
      >
        {profile.wordmark}
      </span>

      <Link
        href="/resume"
        className="glass absolute left-5 top-5 z-10 hidden items-center gap-2 rounded-full py-2 pl-4 pr-3 text-[13px] font-medium text-neutral-700 sm:flex"
        data-glass
        suppressHydrationWarning
      >
        Resume · updated {resume.updated}
        <ArrowRight className="size-3.5 text-neutral-400" />
      </Link>

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <p className="font-display text-2xl font-semibold tracking-tight text-neutral-800">
          {profile.greeting} <span className="inline-block">👋</span>
        </p>

        <h1 className="mt-1 font-display text-[clamp(2.75rem,8vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-neutral-900">
          {profile.headline}
        </h1>

        <div className="relative my-2 aspect-[901/675] w-[360px] sm:w-[432px]">
          <Image
            src={profile.avatar}
            alt={profile.fullName}
            fill
            sizes="(min-width: 640px) 432px, 360px"
            quality={95}
            priority
            className="object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.10)]"
          />
        </div>

        {/* Nudged down on a phone held upright — `max-sm:portrait:` rather than the site's usual
            bare `sm:`, since this one is genuinely about orientation and not just width. Landscape
            never needs it: turning any real phone sideways alone clears the 640px breakpoint (an
            iPhone SE, the narrowest current one, is already 667px on its short side), so `sm:` would
            in practice already exclude it — this is here so that stays true by construction rather
            than by coincidence of today's device sizes. */}
        <div className="max-sm:portrait:mt-6">
          <ChatDock />
        </div>
      </div>
    </section>
  );
}
