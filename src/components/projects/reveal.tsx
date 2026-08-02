"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/chat/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * The Me panel's reveal, on a page that scrolls.
 *
 * `src/components/chat/reveal.tsx` sequences a panel by hand: each step waits to be told it's its
 * turn, and a step that hasn't arrived renders nothing so the panel grows downward as it fills in.
 * That's right for a chat answer, which is short, entirely above the fold, and contains typing
 * whose length nobody knows in advance.
 *
 * Neither of those holds here. A project section is roughly a screen tall, there are seven of them,
 * and every duration is a constant — so the sequencer buys nothing that CSS delays don't, and the
 * render-nothing trick would be actively wrong: a step appearing would reflow a page the visitor is
 * scrolling. So the two halves swap. Steps hold their space and only turn on (`useArrival` +
 * `Step`), and what plays them isn't a running clock but the section reaching the screen.
 *
 * What's kept is the vocabulary — the same `.reveal-lift`/`.reveal-fade` in `globals.css`, driven
 * by the same kind of hand-picked ms constants, so a lift on /projects and a lift in the Me panel
 * are the same movement rather than two things that merely both fade.
 */

/**
 * How far up the screen a section's content has to come before it starts arriving.
 *
 * Trimming the bottom of the root rather than asking for a threshold: sections are tall enough that
 * "10% of it is showing" and "any of it is showing" are the same moment, and what actually matters
 * is that the copy is clear of the fold when it starts, not that some fraction of a screen-high box
 * is. The observer is put on the content row, not the section — the section's padding would trip it
 * a couple hundred pixels before there was anything to look at.
 */
const TRIGGER_MARGIN = "0px 0px -10% 0px";

/**
 * Whether this section's steps are allowed to play, and the ref that decides it.
 *
 * `ready` is the caller's own gate — on /projects it's the intro turn having finished closing — and
 * it's checked separately from being on screen so the first section, which is in view from the
 * first frame, still waits for the turn above it instead of arriving underneath it.
 *
 * Latched, not tracked: once a section has arrived it stays arrived. An observer left live would
 * replay the whole page every time it was scrolled back over, which is a thing pages do and a thing
 * people scroll past twice on purpose to stop happening.
 */
export function useArrival(ready: boolean) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  // Whether this section was already above the viewport the first time it was checked — a refresh
  // landing mid-page, a `#slug` link, or a back-navigation with scroll restored all start the
  // observer below section 0. A skipped section's `isIntersecting` never turns true on its own
  // (scrolling back up to it is not something the chain can wait for), so without this every
  // section downstream of it stays gated on a settle that can never fire. See `skipSettle` below.
  const skippedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          if (entry.boundingClientRect.top > 0) return;
          skippedRef.current = true;
        }
        setSeen(true);
        observer.disconnect();
      },
      { rootMargin: TRIGGER_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);

  // Reduced motion doesn't wait for anything. The steps here gate only appearance — unlike the
  // chat panel's, they're already in the document — so arming them all on the first frame is the
  // whole of it, and the `@media` block on `.reveal-*` takes care of the movement itself.
  //
  // `reduced` is handed back too: a caller that chains its own settling off `armed` (a section
  // waiting for the one above it to finish, say) needs to know when there's no animation to wait
  // out, or the chain would sit on a timer for a movement that never plays.
  //
  // `skipSettle` covers the other way a caller's settle-timer can be skipped: a section nobody is
  // watching arrive doesn't need its arrival timed, and offscreen sections must hand off
  // immediately or the whole chain behind them stalls waiting on a movement nobody will see.
  return { ref, armed: reduced || (ready && seen), reduced, skipSettle: reduced || skippedRef.current };
}

/**
 * One step of a section's arrival: in the layout from the start, visible on its own beat.
 *
 * `fadeMs` alone only fades; with `liftMs` it also travels, for longer than it fades, so the thing
 * is readable while it's still settling — see `.reveal-lift` in `globals.css` and the Me panel,
 * which is where the pattern comes from.
 *
 * `delayMs` is the step's place in the order. The chat panel derives that from steps reporting in;
 * here every length is known up front, so the order is just arithmetic on constants and the browser
 * runs it — one class change per section instead of a chain of timers per element.
 */
export function Step({
  armed,
  fadeMs,
  liftMs,
  delayMs = 0,
  className,
  children,
}: {
  armed: boolean;
  fadeMs: number;
  liftMs?: number;
  delayMs?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={
        {
          animationDelay: `${delayMs}ms`,
          "--reveal-fade": `${fadeMs}ms`,
          ...(liftMs !== undefined && { "--reveal-lift": `${liftMs}ms` }),
        } as React.CSSProperties
      }
      // `both` fill on the animations is what makes the delay a wait rather than a flash: the step
      // holds the first frame — transparent, and dropped by `1rem` if it lifts — until its turn.
      className={cn(
        armed ? (liftMs !== undefined ? "reveal-lift" : "reveal-fade") : "opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
