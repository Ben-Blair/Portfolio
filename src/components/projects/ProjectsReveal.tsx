"use client";

import { useState } from "react";

import { ProjectSection } from "@/components/projects/ProjectSection";
import { ProjectsIntro } from "@/components/projects/ProjectsIntro";
import type { Project } from "@/lib/schema";

/**
 * Owns the one piece of state the intro and the project list have to agree on: whether the intro
 * is still playing.
 *
 * Each section stages its own arrival, a part at a time, when it reaches the screen — see
 * `ProjectSection` and `./reveal.tsx`. This used to be a single fade on this wrapper instead, for
 * two reasons that the per-section version answers rather than ignores. Sections run roughly a
 * screen tall, so anything that *travels* by section reads as the page sliding: what travels now is
 * a title, a picture, a line of copy, an inch each. And a stagger fixed in time would animate
 * sections far below the fold while you were still reading the first one: the stagger now belongs
 * to each section separately and starts when that section is in front of you.
 *
 * What's left here is the gate. A bare `/projects` visit has no intro to wait for, so `ready` is
 * true from the first render and the first section arrives as soon as it's on screen, which it is.
 * Arriving via the Projects pill (`asked`), everything holds until `ProjectsIntro` reports that its
 * turn has actually finished closing. That has to be a single event both sides can see rather than
 * each side guessing the other's timing from a constant. Starting any earlier would mean a section
 * arrives and is then carried by the turn collapsing out from under it, which reads as two
 * movements.
 *
 * The wrapper stays `opacity-0` rather than un-rendering: the list has to hold its full height
 * through that collapse, which is what lets the 270px of travel happen where nobody can see it.
 * `.reveal-*` (globals.css) already answers `prefers-reduced-motion`, so there's no `motion-reduce:`
 * to write here.
 */
export function ProjectsReveal({ projects, asked }: { projects: Project[]; asked: boolean }) {
  const [ready, setReady] = useState(!asked);

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
            ready={ready}
          />
        ))}
      </div>
    </>
  );
}
