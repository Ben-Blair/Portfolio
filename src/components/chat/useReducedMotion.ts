"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(REDUCED_MOTION).matches;

// The server can't know the preference. Guessing "reduce" would ship markup with the answer
// already written into it, which then has to un-write itself on hydration.
const getServerSnapshot = () => false;

/**
 * Whether the visitor has asked for less movement.
 *
 * A media query rather than a CSS class because the answers here don't just animate — the typing
 * and the panel sequencer gate *content* on a timer, and a `motion-reduce:` class can only turn
 * off the animation, not hand back the words it was holding.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
