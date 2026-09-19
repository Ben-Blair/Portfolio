"use client";

import { useLayoutEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** Must match `.typing-dot` in `globals.css`. */
const PERIOD_MS = 1400;
const STAGGER_MS = [0, 160, 320] as const;

/**
 * When the dots first appeared this think, so a remount can join the same cycle.
 *
 * The bubble is drawn in three places that swap for each other — the root overlay, `/projects`'s
 * loading shell, and the destination page — and on a production navigation those remounts are
 * far enough apart to see. Restarting the CSS animation at each one is the reset that looks
 * fine on localhost (the swap is a frame) and wrong on the real site. A negative delay is how
 * CSS says "this has already been running"; keep one clock and every copy lands on it.
 *
 * The clock only lives while at least one copy is mounted. The last unmount clears it, so the
 * next think starts on the first frame: all three small, then the left one grows.
 */
let startedAt: number | null = null;
let mounted = 0;

function retainClock() {
  if (mounted++ === 0) startedAt = performance.now();
  return (performance.now() - (startedAt ?? performance.now())) % PERIOD_MS;
}

function releaseClock() {
  mounted -= 1;
  if (mounted <= 0) {
    mounted = 0;
    startedAt = null;
  }
}

/**
 * iOS's spinner: the received bubble that says the other person is writing.
 *
 * `leaving` is the beat where it stops saying that. The pulse is paused rather than removed, so
 * the dots hold wherever they happened to be instead of snapping level, and the bubble drifts down
 * as it fades — away from the question, which is going up. See `.typing-dot` in `globals.css`.
 *
 * Its own module rather than living in `Answer` with the rest of the turn, which is where it was.
 * `/projects` now opens its turn inside a `loading.tsx` shell — see `ProjectsTurnFrame` — and that
 * shell's whole value is being small enough to be prefetched and painted in the same tick as the
 * click. Reaching into `Answer` for these three dots would have dragged `MediaBlock`, and the
 * carousel, video and 3D viewer behind it, into the one chunk on the site that has to be tiny.
 */
export function TypingDots({ leaving = false }: { leaving?: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  // Before paint, so a remount never flashes the start of the cycle. `useState(0)` matches the
  // server; this is the client catching up to the shared clock. Release on unmount so a later
  // think starts from the first frame instead of wherever this one left off.
  useLayoutEffect(() => {
    setElapsed(retainClock());
    return releaseClock;
  }, []);

  return (
    <div
      className={cn(
        "flex w-fit items-center gap-1.5 rounded-3xl rounded-bl-lg bg-neutral-100 px-4 py-3.5",
        // Transition only on the way out. Switching pills mid-leave used to set `leaving` false
        // and play the fade *backwards*, which reads as the bubble resetting.
        leaving &&
          "translate-y-4 opacity-0 transition-[opacity,translate] duration-[360ms] ease-out motion-reduce:transition-none",
      )}
    >
      {STAGGER_MS.map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay - elapsed}ms` }}
          className={cn(
            "typing-dot size-2 rounded-full bg-neutral-400",
            leaving && "[animation-play-state:paused]",
          )}
        />
      ))}
    </div>
  );
}
