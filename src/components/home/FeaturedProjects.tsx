import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/schema";

export function FeaturedProjects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-none tracking-[-0.035em]">
            Selected work
          </h2>
          <p className="mt-3 text-[15px] text-neutral-500">
            Computer vision, 3D capture, and things that run on hardware.
          </p>
        </div>
        <Link
          href="/projects"
          className="hidden shrink-0 items-center gap-1.5 text-[14px] font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:inline-flex"
        >
          All projects
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {projects.map((project) => (
          <li key={project.slug}>
            <Link
              href={`/projects/${project.slug}`}
              className="group block overflow-hidden rounded-3xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-neutral-50">
                {project.cover && (
                  <Image
                    src={project.cover}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-[19px] font-bold leading-snug tracking-tight text-neutral-900">
                    {project.title}
                  </h3>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-900" />
                </div>

                <p className="mt-2 text-[14.5px] leading-relaxed text-neutral-600">
                  {project.tagline}
                </p>

                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {project.tags.slice(0, 4).map((tag) => (
                    <li key={tag}>
                      <Badge variant="secondary" className="rounded-full font-normal">
                        {tag}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/projects"
        className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:hidden"
      >
        All projects
        <ArrowUpRight className="size-4" />
      </Link>
    </section>
  );
}
