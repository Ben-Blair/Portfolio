"use client";

import { useCallback, useState } from "react";

import { ProjectSection } from "@/components/projects/ProjectSection";
import { ProjectsIntro } from "@/components/projects/ProjectsIntro";
import type { Project } from "@/lib/schema";

/**
 * Owns the two things the intro and the project list have to agree on: whether the intro is still
 * playing, and how far down the list has settled.
 *
 * Each section stages its own arrival when it reaches the screen — see `ProjectSection` and
 * `./reveal.tsx`. This used to be a single fade on this wrapper instead, for a reason the per-section
 * version answers rather than ignores: sections run roughly a screen tall, so anything that
 * *travels* by section reads as the page sliding, where what travels now is a title, a picture, a
 * line of copy, an inch each.
 *
 * Reaching the screen isn't enough on its own, though — on a fast scroll a section can reach the
 * screen while the one above it is still fading in, and two sections arriving at once reads as the
 * list stumbling rather than a sequence. So a section's own arrival is gated on both: it has to be on
 * screen *and* its predecessor has to have actually finished (`settledIndex`, fed by each section's
 * `onSettled`) — the same shape as the intro gate below it, just one link longer per section instead
 * of one link long.
 *
 * The intro gate: a bare `/projects` visit has no intro to wait for, so `ready` is true from the
 * first render and the first section arrives as soon as it's on screen, which it is. Arriving via
 * the Projects pill (`asked`), everything holds until `ProjectsIntro` reports that its turn has
 * actually finished closing. That has to be a single event both sides can see rather than each side
 * guessing the other's timing from a constant. Starting any earlier would mean a section arrives and
 * is then carried by the turn collapsing out from under it, which reads as two movements.
 *
 * The wrapper stays `opacity-0` rather than un-rendering: the list has to hold its full height
 * through that collapse, which is what lets the 270px of travel happen where nobody can see it.
 * `.reveal-*` (globals.css) already answers `prefers-reduced-motion`, so there's no `motion-reduce:`
 * to write here.
 */
export function ProjectsReveal({ projects, asked }: { projects: Project[]; asked: boolean }) {
  const [ready, setReady] = useState(!asked);

  // The last section confirmed fully settled — see `ProjectSection`'s `onSettled`. A section's own
  // `ready` is gated on its predecessor showing up here, the same way the whole list is gated on the
  // intro above: one section arriving and the next starting are never allowed to overlap, so a fast
  // scroll can't outrun the sequence and land two sections fading in at once.
  const [settledIndex, setSettledIndex] = useState(-1);
  const handleSettled = useCallback((index: number) => {
    setSettledIndex((prev) => Math.max(prev, index));
  }, []);

  return (
    <>
      {asked && <ProjectsIntro onSettled={() => setReady(true)} />}

      <div className={ready ? undefined : "opacity-0"}>
        {projects.map((project, index) => (
          <ProjectSection
            key={project.slug}
            project={project}
            index={index}
            total={projects.length}
            ready={ready && settledIndex >= index - 1}
            onSettled={handleSettled}
          />
        ))}
      </div>
    </>
  );
}
