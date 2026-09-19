"use client";

import { useEffect, useState } from "react";

import { QuestionBubble } from "@/components/chat/QuestionBubble";
import { TypingDots } from "@/components/chat/TypingDots";
import { armedTurn, openTurn, PROJECTS_QUESTION } from "@/components/projects/turnHandoff";

/**
 * The frame the Projects turn opens on, played while the page behind it is still being fetched.
 *
 * This is `/projects`'s `loading.tsx`, and that's still load-bearing: a loading boundary is what
 * earns a dynamic route a prefetchable shell. The first paint of the turn, though, is now the
 * overlay in the root layout — already hydrated on the page you clicked from, so a first visit
 * doesn't wait on this chunk. This copy sits under that overlay (or plays the opening itself on
 * a hard load that never armed), and `ProjectsIntro` takes the turn over when the page lands.
 *
 * Deliberately a copy of `ProjectsIntro`'s resting frame rather than a spinner of its own —
 * same measure, same padding, same two elements in the same order. The swap across the Suspense
 * boundary has nothing to show: one bubble, one set of dots, the network hidden inside an
 * animation that was always meant to cover a wait.
 *
 * Imports `TypingDots` from its own module, not from `Answer` — see the note there. This is the
 * one chunk on the site whose only job is to be small.
 *
 * Renders nothing at all unless a turn was actually armed and the overlay hasn't already opened
 * it. This boundary covers `/projects/[slug]` too, and a bare `/projects` is a link that
 * `/skills` and every project page offer; none of those asked a question, and none of them
 * should be answered.
 */
export function ProjectsTurnFrame() {
  // Read once, at mount. A later render must not be able to take the turn back off the screen
  // after the effect below has retired the arm.
  const [turn] = useState(armedTurn);

  useEffect(() => {
    if (turn) openTurn();
  }, [turn]);

  if (!turn) return null;

  return (
    <section className="relative px-5">
      {/* The chat's measure, so the bubble and the dots sit exactly where `ProjectsIntro` is
          about to redraw them. The grid rows it animates are both at their open value here and
          so are left out; what stays is every box that contributes geometry, because anything
          that differs between the two is a jump at the handoff. */}
      <div className="mx-auto w-full max-w-2xl pt-28 pb-8 sm:pt-32">
        <QuestionBubble question={turn.question || PROJECTS_QUESTION} hidden={false} lift />

        <div aria-hidden="true">
          <TypingDots />
        </div>
      </div>
    </section>
  );
}
