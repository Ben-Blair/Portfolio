"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/chat/useReducedMotion";

/**
 * How fast the answer appears to be typed, in characters per second, and how long the typing
 * carries on after the model has stopped talking.
 *
 * The rate is deliberately constant. Scaling it up to chase the stream made the speed visibly
 * surge, which reads as a machine catching up rather than a person writing.
 *
 * The grace period is what makes the typing visible at all. The model doesn't trickle: measured
 * on a typical 429-character answer, the first token arrived at 1.1s and the whole thing was
 * complete by 1.35s. Stopping the moment it finished typed fourteen characters — three percent —
 * before handing the rest over, so there was nothing to watch. Typing instead runs on for
 * `GRACE` past the end and only then gives up the remainder, which puts the majority of a normal
 * answer on screen a character at a time and bounds how long the whole reveal can take.
 *
 * Between them these two set how much of an answer types versus fades. Raise the rate to type
 * more of it; lower it to make the typing feel more human and let the fade do the work.
 */
const TYPING_CPS = 280;
const TYPING_GRACE_MS = 2500;

/**
 * Reveals a growing string one character at a time, as if someone were typing it.
 *
 * Built for streamed text: `text` is expected to grow between renders, and the typing chases it
 * rather than racing it — the cursor can never pass what has actually arrived. If `text` is
 * replaced instead of extended (a new question), the typing starts over.
 *
 * Set `done` when the source has stopped growing. Typing carries on for a moment longer and then
 * gives up whatever it hasn't reached as `tail`: nobody should be made to watch an animation
 * spell out an answer that is already, verifiably, complete. How the tail gets on screen is the
 * caller's business.
 *
 * `typing` is true only while there is ground left to cover and the source is still growing. It
 * goes false whenever the cursor catches up mid-answer, so don't use it alone to decide whether
 * an answer has finished arriving — pair it with the request status.
 */
export function useTypewriter(
  text: string,
  { active = true, done = false }: { active?: boolean; done?: boolean } = {},
) {
  const [count, setCount] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);

  const reduced = useReducedMotion();

  // The animation reads and writes these every frame; state would restart the loop each time.
  const countRef = useRef(0);
  const carryRef = useRef(0);
  const seenRef = useRef("");
  const deadlineRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || reduced) return;

    // A stream only ever appends. Anything else is a different answer, so don't type it from
    // whatever position the last one happened to reach.
    if (!text.startsWith(seenRef.current)) {
      countRef.current = 0;
      carryRef.current = 0;
      deadlineRef.current = null;
      setCount(0);
      setGaveUp(false);
    }
    seenRef.current = text;

    // The clock the typing is racing, started the moment the model stopped talking.
    if (!done) {
      deadlineRef.current = null;
    } else if (deadlineRef.current === null) {
      deadlineRef.current = performance.now() + TYPING_GRACE_MS;
    }

    if (countRef.current >= text.length) return;

    // Time-based rather than a character per tick, so the speed is the same on a 120Hz display
    // as on a 60Hz one. `carryRef` holds the fraction of a character owed from the last frame;
    // it lives in a ref because this effect restarts on every token that arrives, and at this
    // rate a single frame is worth less than one character.
    let frame = 0;
    let last = performance.now();

    // Reading the clock here rather than accepting rAF's timestamp puts this delta and the
    // deadline above on the same one. rAF's comes off the document timeline, which can be
    // rescaled — and a timestamp from a rescaled clock compared against `last` from this one
    // yields a negative delta, which stalls the typing permanently.
    const step = () => {
      const now = performance.now();

      if (deadlineRef.current !== null && now >= deadlineRef.current) {
        setGaveUp(true);
        return;
      }

      carryRef.current += TYPING_CPS * ((now - last) / 1000);
      last = now;

      const whole = Math.floor(carryRef.current);
      if (whole > 0) {
        carryRef.current -= whole;
        countRef.current = Math.min(text.length, countRef.current + whole);
        setCount(countRef.current);
      }

      if (countRef.current < text.length) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [text, active, done, reduced]);

  // Both opt-outs hand back the whole string as already typed rather than freezing at whatever
  // the cursor had reached, so nothing can strand a half-written answer on screen.
  if (!active || reduced) return { typed: text, tail: "", typing: false };

  // `count` can outlive the string it was counting for one render, between a new question
  // landing and the effect above resetting it.
  const cursor = Math.min(count, text.length);

  // Gated on `done` as well, so a `gaveUp` left over from the previous answer can't hand off the
  // next one before it has started.
  const handedOff = done && gaveUp && cursor < text.length;

  return {
    typed: text.slice(0, cursor),
    tail: handedOff ? text.slice(cursor) : "",
    typing: !handedOff && cursor < text.length,
  };
}
