import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MediaBlock } from "@/components/media/MediaBlock";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/schema";

/**
 * One full-height section of the /projects scroll.
 *
 * Media and copy alternate sides down the page so it doesn't read as a list of identical
 * rows. The section is tinted with the project's own `accent`.
 */
export function ProjectSection({
  project,
  index,
  total,
}: {
  project: Project;
  index: number;
  total: number;
}) {
  const flipped = index % 2 === 1;
  const hero = project.media[0];

  return (
    <section
      id={project.slug}
      className="relative flex min-h-[100svh] snap-start items-center overflow-hidden py-24"
      style={
        {
          // Consumed by the tint layer below; keeps the accent out of every child class.
          "--accent": project.accent,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.055]"
        style={{
          background: `radial-gradient(70% 60% at ${flipped ? "80%" : "20%"} 40%, var(--accent), transparent 70%)`,
        }}
      />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 md:grid-cols-2 md:gap-14 xl:pr-24">
        <div className={cn("min-w-0", flipped && "md:order-2")}>
          {hero ? (
            <MediaBlock media={hero} />
          ) : (
            <div className="aspect-[16/10] w-full rounded-2xl border border-neutral-200 bg-neutral-50" />
          )}
        </div>

        <div className={cn("min-w-0", flipped && "md:order-1")}>
          <p className="mb-4 font-mono text-[12px] tracking-widest text-neutral-400">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            {project.status && <span className="ml-3 normal-case">{project.status}</span>}
          </p>

          <h2 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-neutral-900">
            {project.title}
          </h2>

          <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-neutral-600">
            {project.tagline}
          </p>

          <ul className="mt-6 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="secondary" className="rounded-full font-normal">
                  {tag}
                </Badge>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={`/projects/${project.slug}`}
              className="glass-dark inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-medium text-white"
              data-glass
            >
              Read more
              <ArrowUpRight className="size-4" />
            </Link>

            {project.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="glass inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-medium text-neutral-700"
                data-glass
              >
                {link.label}
                <ArrowUpRight className="size-4 text-neutral-400" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
