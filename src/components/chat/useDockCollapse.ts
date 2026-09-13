"use client";

import { useEffect, useRef, useState } from "react";

/**
 * How much travel earns a state change, in px.
 *
 * Asymmetric on purpose. Collapsing is the destructive direction — it takes the site's only
 * navigation off the screen — so it needs a deliberate downward scroll rather than the slop at the
 * end of a flick. Opening is the recovery, and someone scrolling back up wants the pills the moment
 * they've clearly changed their mind. Making the two equal made the row feel like it was arguing
 * with short swipes.
 */
const COLLAPSE_TRAVEL = 24;
const OPEN_TRAVEL = 16;

/**
 * Inside this many px of the top the row is always open, whatever the last direction was.
 *
 * Not zero: iOS reports fractional offsets during the rubber-band settle at the top of a page, so a
 * strict `=== 0` leaves the dock collapsed on a page the visitor has scrolled all the way back up.
 */
const TOP = 8;

/**
 * Whether the dock's pill row should be showing, from the scroll direction.
 *
 * Scroll down and the row sinks into the "Ask me anything" field; scroll up and it rises back out.
 * The point is that the dock stops being a fixed cost — on a phone the pills and the field together
 * are about a quarter of the screen, and most of the time you are reading the page rather than
 * navigating it.
 *
 * Returns a boolean and nothing else: *whether* the row is open is a scroll question, but *whether
 * that does anything* is a width question, and the width half is answered in CSS by
 * `sm:grid-rows-[1fr]` in `DockShell`. Keeping the breakpoint out of here means no `matchMedia`, no
 * resize listener, and no server/client disagreement about how wide the screen is — this hook
 * returns `true` on the server and on the first client render either way, which is the state that
 * needs no correcting.
 *
 * @param paused Freeze the current state and ignore scrolling entirely. Passed the dock's
 *   `fieldFocused`: showing the iOS keyboard scrolls the page under the input, and the row
 *   flickering shut beneath the thing you just tapped is the one moment this must not react to.
 */
export function useDockCollapse(paused = false) {
  const [open, setOpen] = useState(true);

  // Where the current run of scrolling started, and which way it was going. Refs rather than state:
  // these change on every scroll event and nothing renders from them.
  const anchor = useRef(0);
  const down = useRef(false);
  const frame = useRef(0);

  useEffect(() => {
    if (paused) return;

    // Start each run from wherever the page is now, not from wherever it was when the listener was
    // last attached — otherwise focusing and blurring the input part-way down a page leaves an
    // anchor thousands of pixels away, and the first scroll after that flips the row instantly.
    anchor.current = window.scrollY;

    const read = () => {
      frame.current = 0;

      // Clamped because iOS reports negative offsets while rubber-banding past the top, which would
      // otherwise read as a large upward travel and then a large downward one on the way back.
      const y = Math.max(0, window.scrollY);

      if (y <= TOP) {
        anchor.current = y;
        setOpen(true);
        return;
      }

      const delta = y - anchor.current;
      if (delta === 0) return;

      // A change of direction starts a new run. Without this, one long scroll down leaves the
      // anchor far above, and the upward travel needed to open the row is however far you happened
      // to have scrolled rather than the 16px it's supposed to be.
      const goingDown = delta > 0;
      if (goingDown !== down.current) {
        down.current = goingDown;
        anchor.current = y;
        return;
      }

      if (goingDown ? delta > COLLAPSE_TRAVEL : -delta > OPEN_TRAVEL) {
        anchor.current = y;
        setOpen(!goingDown);
      }
    };

    // Coalesced into one frame, the same way `DockShell` handles `pointermove`: scroll fires far
    // faster than the compositor can use, and every one of these can commit a React state change.
    const onScroll = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [paused]);

  return open;
}
