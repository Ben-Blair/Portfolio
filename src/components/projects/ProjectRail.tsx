"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The sticky progress rail down the right edge of /projects. Highlights whichever section
 * is currently closest to the middle of the viewport, and lets you jump between them.
 */
export function ProjectRail({ projects }: { projects: { slug: string; title: string }[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const sections = projects
      .map((project) => document.getElementById(project.slug))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const onScroll = () => {
      const mid = window.innerHeight / 2;
      let closest = 0;
      let closestDistance = Infinity;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - mid);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = index;
        }
      });

      setActiveIndex(closest);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [projects]);

  return (
    <nav
      aria-label="Project navigation"
      className="pointer-events-none fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 xl:block"
    >
      <ul className="pointer-events-auto flex flex-col items-end gap-3">
        {projects.map((project, index) => (
          <li key={project.slug}>
            <a
              href={`#${project.slug}`}
              className="group flex items-center justify-end gap-2.5"
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <span
                className={cn(
                  "whitespace-nowrap text-[12.5px] font-medium transition-all",
                  index === activeIndex
                    ? "text-neutral-900 opacity-100"
                    : "text-neutral-400 opacity-0 group-hover:opacity-100",
                )}
              >
                {project.title}
              </span>
              <span
                className={cn(
                  "block h-px transition-all duration-300",
                  index === activeIndex
                    ? "w-7 bg-neutral-900"
                    : "w-3.5 bg-neutral-300 group-hover:w-5 group-hover:bg-neutral-500",
                )}
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
