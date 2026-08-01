"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { Answer, withoutPartialBold, wordBoundary } from "@/components/chat/Answer";
import { useReducedMotion } from "@/components/chat/useReducedMotion";
import { useTypewriter } from "@/components/chat/useTypewriter";
import { cn } from "@/lib/utils";

/**
 * The machinery that lets a written panel arrive like a spoken answer.
 *
 * A panel is a script: numbered steps that play in order, each waiting for the one before it.
 * `Fade` is for the things a person doesn't write a word at a time — a photo, a heading, a row
 * of links — and `Typed` is for the sentences, which go through the same typewriter and the same
 * renderer the model's answers do. That shared path is the whole trick: the pills cost nothing,
 * and there's nothing in the reveal to give that away.
 *
 * Steps are numbered by hand rather than counted from the tree. It's a few more characters at
 * each site and it means the order is legible in the markup instead of emerging from render
 * order, which is what you want when the thing you're debugging *is* the order.
 */

/** How long a faded step holds before the next one starts, so a run of them cascades. */
const FADE_STEP_MS = 180;

/** The pause after the typing lands, long enough for the tail's word-by-word fade to finish. */
const TYPED_SETTLE_MS = 400;

/** How still the sequencer has to be before the panel counts as fully arrived. */
const SETTLED_MS = 600;

/**
 * The step being waited on — everything below it is already on screen — or `null` for "no script
 * is playing", which is what a block rendered outside a `PanelAnswer` sees.
 */
const CurrentContext = createContext<number | null>(null);

/**
 * Kept apart from the step above, and deliberately.
 *
 * A step's `finish` is the dependency of the timer that fires it, so it has to hold still. Both
 * halves in one context object would mint a new one on every render of the panel — including the
 * ones that only settle `quietAt` — and each would clear and restart a timer that was already
 * counting down. `advance` never changes; `current` is the half that's allowed to.
 */
const AdvanceContext = createContext<(step: number) => void>(() => {});

/**
 * Where a step finds out whether it's its turn, and how it says it's finished.
 *
 * Outside a `PanelAnswer` there's no script to play, so every step reports itself as reached and
 * `finish` goes nowhere — the block renders whole, which is the right answer for a static page.
 */
function useStep(step: number) {
  const current = useContext(CurrentContext);
  const advance = useContext(AdvanceContext);

  const finish = useCallback(() => advance(step), [advance, step]);
  const reached = current === null || current >= step;

  return { reached, finish };
}

/**
 * Plays the steps inside it in order.
 *
 * Key this on the panel so moving from one pill to another starts a new script rather than
 * resuming the last one partway through.
 */
export function PanelAnswer({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(0);

  // Never backwards, and never past the step that reported in: a step that finishes twice — a
  // double-invoked effect, a timer that fired after a re-render — must not skip the next one.
  const advance = useCallback(
    (step: number) => setCurrent((reached) => Math.max(reached, step + 1)),
    [],
  );

  // The script has no idea how long it is, so "finished" is measured as stillness rather than
  // counted: once nothing has advanced for a moment, everything that was going to arrive has.
  // Recording *which* step went quiet rather than a flag means the next one to land un-settles
  // it on its own, with no reset to undo first.
  const [quietAt, setQuietAt] = useState(-1);
  useEffect(() => {
    const timer = setTimeout(() => setQuietAt(current), SETTLED_MS);
    return () => clearTimeout(timer);
  }, [current]);
  const settled = quietAt === current;

  return (
    <AdvanceContext.Provider value={advance}>
      {/* Reduced motion skips the script entirely. The steps gate content, not just movement, so
          leaving them to their timers would hold real words back from someone who asked for less
          animation — the `motion-reduce:` classes can't reach that. */}
      <CurrentContext.Provider value={reduced ? null : current}>
        {/* Not `aria-hidden` the way a streamed answer is: a panel is made of links, an email
            address and a résumé button, and hiding them would leave nothing to use. */}
        <div aria-busy={!reduced && !settled}>{children}</div>
      </CurrentContext.Provider>
    </AdvanceContext.Provider>
  );
}

/**
 * A step that appears all at once — an image, a heading, a group of links.
 *
 * Uses the same fade the streamed answer's tail does, so the two read as one vocabulary. `rise`
 * adds a short lift from below for the steps that should feel like they arrived rather than
 * simply turned on. It's deliberately not the default: a run of steps that all slide reads as a
 * list animating itself, where a mix of lifts and plain fades reads as a thing assembling.
 *
 * `fadeMs`/`liftMs` are the long way round, for the step whose length is measured against another
 * step's rather than picked off the scale — a fade that has to outlast its own travel, or one that
 * has to end on the exact frame the step above it finishes arriving. `fadeMs` alone is the same
 * thing without the travel. See `.reveal-lift` and `.reveal-fade` in `globals.css`.
 *
 * `hold` is how the step after this one gets to start on a seam — the end of this step's fade,
 * usually — rather than a fixed beat after this one mounted.
 */
export function Fade({
  step,
  rise = false,
  duration = "duration-300",
  fadeMs,
  liftMs,
  delayMs = 0,
  hold = FADE_STEP_MS,
  className,
  children,
}: {
  step: number;
  rise?: boolean;
  /** Tailwind duration class. A step that travels wants longer than one that only fades. */
  duration?: string;
  /**
   * Fade and lift lengths in ms, replacing `duration` and `rise`. `fadeMs` alone only fades;
   * with `liftMs` it travels for longer than it fades.
   */
  fadeMs?: number;
  liftMs?: number;
  /** Offsets the whole reveal, for two things on one step that shouldn't start together. */
  delayMs?: number;
  /** How long to hold before releasing the next step. Defaults to a beat. */
  hold?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { reached, finish } = useStep(step);

  useEffect(() => {
    if (!reached) return;
    const timer = setTimeout(finish, hold);
    return () => clearTimeout(timer);
  }, [reached, finish, hold]);

  // Nothing at all rather than something hidden, so the panel grows downward as it arrives
  // instead of sitting in a page-height hole waiting to be filled.
  if (!reached) return null;

  const measured = fadeMs !== undefined;

  return (
    <div
      style={
        {
          animationDelay: `${delayMs}ms`,
          ...(measured && { "--reveal-fade": `${fadeMs}ms` }),
          ...(liftMs !== undefined && { "--reveal-lift": `${liftMs}ms` }),
        } as React.CSSProperties
      }
      className={cn(
        measured
          ? liftMs !== undefined
            ? "reveal-lift"
            : "reveal-fade"
          : cn(
              "animate-in fill-mode-both ease-out fade-in-0 motion-reduce:animate-none",
              duration,
              rise && "slide-in-from-bottom-3",
            ),
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A step that types itself out, the way the model's prose does.
 *
 * `done` is true from the first render because a written answer is, by definition, already
 * finished — there's no stream to wait on. That arms the typewriter's grace period immediately,
 * so a long passage types for a couple of seconds and then hands the rest to the word-by-word
 * fade: the same split a fast reply produces, for the same reason. Nobody should have to watch
 * three paragraphs spell themselves out.
 */
export function Typed({ step, text }: { step: number; text: string }) {
  const { reached, finish } = useStep(step);
  const { typed, tail, typing } = useTypewriter(text, {
    active: reached,
    done: true,
  });

  const shown = tail ? typed + tail : withoutPartialBold(typed);
  const fadeFrom = tail ? (typed ? wordBoundary(shown, typed.length) : 0) : null;

  // Waits out the tail's fade before releasing the next step, so a paragraph is finished being
  // read into place before the thing under it starts to appear.
  const finished = reached && !typing;
  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(finish, TYPED_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [finished, finish]);

  if (!reached) return null;

  return <Answer text={shown} fadeFrom={fadeFrom} caret={typing} />;
}
