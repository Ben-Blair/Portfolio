"use client";

import { useEffect, useSyncExternalStore } from "react";

import { QuestionBubble } from "@/components/chat/QuestionBubble";
import { TypingDots } from "@/components/chat/TypingDots";
import { PAGE_BACKDROP_IMAGE } from "@/components/site/backdrop";
import {
  clearThink,
  endTurn,
  getServerTurnSnapshot,
  openTurn,
  subscribeTurn,
  turnSnapshot,
} from "@/components/projects/turnHandoff";

/**
 * The opening frame of a chat turn, painted from the page you clicked on.
 *
 * `/projects`'s `loading.tsx` and `/chat`'s client tree both have to be fetched before they can
 * draw anything, and on a first visit that fetch *is* the pause. This overlay lives in the root
 * layout, so it's already hydrated when the pill is pressed: the bubble is on screen in the same
 * tick, and the destination loads underneath it. `ProjectsIntro` and `ChatView` take the turn
 * over when they mount, and `endTurn` is what takes this off the screen.
 *
 * z-10 sits above page content and below the dock (z-20 / z-30) and the back-home avatar (z-50),
 * so the furniture of the destination can appear as it lands without the bubble having to wait
 * for it.
 */
export function TurnOverlay() {
  const turn = useSyncExternalStore(subscribeTurn, turnSnapshot, getServerTurnSnapshot);

  useEffect(() => {
    if (turn) openTurn();
  }, [turn]);

  // Back/forward cancels a pending turn: the destination never claims it, and without this the
  // overlay would sit on the page you returned to until the safety TTL ran out.
  useEffect(() => {
    const onPop = () => {
      endTurn();
      clearThink();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!turn) return null;

  return (
    <div aria-hidden className="fixed inset-0 z-10">
      <div
        className="absolute inset-0 bg-white"
        style={turn.surface === "projects" ? { backgroundImage: PAGE_BACKDROP_IMAGE } : undefined}
      />
      <section className="relative px-5">
        <div className="mx-auto w-full max-w-2xl pt-28 pb-8 sm:pt-32">
          <QuestionBubble
            key={turn.question}
            question={turn.question}
            hidden={false}
            lift
            entrance={false}
          />
          <div>
            <TypingDots />
          </div>
        </div>
      </section>
    </div>
  );
}
