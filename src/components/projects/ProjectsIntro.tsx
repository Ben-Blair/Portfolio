"use client";

import { useEffect, useRef, useState } from "react";

import { TypingDots } from "@/components/chat/Answer";
import { QuestionBubble } from "@/components/chat/QuestionBubble";
import { PANEL_EXIT_MS, PANEL_THINKING_MS } from "@/components/chat/timing";
import { useReducedMotion } from "@/components/chat/useReducedMotion";

/**
 * The Projects turn, played at the top of the page it's about.
 *
 * Every other pill answers with a written panel inside `/chat`. This one doesn't get a written
 * answer at all — the answer is the seven sections of photos, video and 3D underneath it, so the
 * turn is just the question and the thinking beat. Once the dots clear, the real project list
 * picks up where they left off.
 *
 * Rendered only for `?ask=1`, which the Projects pill links to. A bare `/projects`, a rail anchor,
 * a refresh or a back-navigation all get the plain page — and once this has played it rewrites the
 * URL to drop the parameter, so watching it once doesn't mean watching it again on reload.
 */

/** The pill's label, expanded into something a person would actually type. Was in `panels.tsx`. */
const QUESTION = "What have you built?";

export function ProjectsIntro({ onSettled }: { onSettled: () => void }) {
  const reduced = useReducedMotion();

  // The same two beats `ChatView` gives a written panel, for the same reasons — see
  // `src/components/chat/timing.ts`. Copied rather than shared: it's a dozen lines, and a hook
  // over two call sites would be a hook that has to keep both honest forever.
  const [exiting, setExiting] = useState(false);
  const [done, setDone] = useState(false);

  // The visitor scrolled. They've decided; an animation whose entire message is "scroll" has
  // nothing left to say to someone already doing it, so everything lands on its last frame at
  // once. Note what this isn't: the page is never prevented from scrolling while this plays.
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), reduced ? 0 : PANEL_THINKING_MS);
    return () => clearTimeout(timer);
  }, [reduced]);

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => setDone(true), reduced ? 0 : PANEL_EXIT_MS);
    return () => clearTimeout(timer);
  }, [exiting, reduced]);

  // Any hint of scrolling ends the whole turn immediately. The listeners are passive, so this can
  // never delay the scroll it's reacting to, and there's no `scroll` among them on purpose — a
  // browser restoring a scroll position would fire one before the visitor had done anything.
  useEffect(() => {
    if (skipped) return;

    const skip = () => {
      setSkipped(true);
      setExiting(true);
      setDone(true);
    };

    const scrollKeys = new Set([
      " ",
      "PageDown",
      "PageUp",
      "ArrowDown",
      "ArrowUp",
      "End",
      "Home",
    ]);
    const onKey = (event: KeyboardEvent) => {
      if (scrollKeys.has(event.key)) skip();
    };

    const options = { passive: true, once: true } as const;
    window.addEventListener("wheel", skip, options);
    window.addEventListener("touchstart", skip, options);
    window.addEventListener("keydown", onKey, { passive: true });
    return () => {
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
      window.removeEventListener("keydown", onKey);
    };
  }, [skipped]);

  // Nothing to replay. Dropping the parameter means a reload lands on the page rather than on the
  // performance, and the back button from a project doesn't play it again either.
  useEffect(() => {
    if (!done) return;
    window.history.replaceState(null, "", "/projects");
  }, [done]);

  // The project list waits for this rather than starting the moment it mounts, so the turn closing
  // and the list arriving never overlap. The outer padding (below) only collapses once `done`
  // flips, i.e. once the bubble and dots have actually finished fading to nothing — collapsing it
  // any earlier would crop them mid-fade instead of letting them clear the screen first.
  //
  // `done` therefore does both things in one commit: the padding goes and the list is released.
  // Since that collapse takes a single frame, the list's whole 270px of upward travel happens
  // while it's still at `opacity-0`, and its fade begins from where it will finish. Nothing the
  // visitor can see ever moves.
  const settled = useRef(false);
  useEffect(() => {
    if (!done || settled.current) return;
    settled.current = true;
    onSettled();
  }, [done, onSettled]);

  return (
    <section className="relative px-5">
      {/* The turn's own padding lives in this collapsing row rather than on the section, so once
          the bubble and dots are gone the intro takes up no space at all — the project list below
          picks up exactly where it would on a bare visit, instead of sitting behind ~150px of dead
          top padding nobody asked to scroll past.

          That collapse is deliberately not animated. It only runs once `done` flips, by which
          point the bubble and dots have already finished fading out on the beat before — so this
          row is an empty box, and there is nothing inside it for an animation to show. Easing it
          shut anyway doesn't read as the box closing; it reads as the entire project list beneath
          it scrolling ~270px up the screen under its own steam, which is the one thing the list's
          fade is trying not to do. Closing it in a single frame moves the list while it's still
          invisible, so it fades in already at rest. */}
      <div className="grid" style={{ gridTemplateRows: done ? "0fr" : "1fr" }}>
        <div className="min-h-0 overflow-hidden">
          {/* The chat's measure, so the bubble and the dots sit exactly where they would on /chat. */}
          <div className="mx-auto w-full max-w-2xl pt-28 pb-8 sm:pt-32">
            <QuestionBubble question={QUESTION} hidden={exiting} lift />

            {/* The same `1fr → 0fr` close the question is doing above it, so both are out of the
                layout by the frame they're done. `min-h-0` rather than `overflow-hidden`: the dots
                leave downward, and clipping them to a row that's shutting would eat the motion
                that says they left. */}
            <div
              aria-hidden="true"
              className="grid transition-[grid-template-rows] duration-[360ms] ease-in-out motion-reduce:transition-none"
              style={{ gridTemplateRows: exiting ? "0fr" : "1fr" }}
            >
              <div className="min-h-0">
                <TypingDots leaving={exiting} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
