import type { Metadata } from "next";

import { ProjectRail } from "@/components/projects/ProjectRail";
import { ProjectsReveal } from "@/components/projects/ProjectsReveal";
import { BackHome } from "@/components/site/BackHome";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "Computer vision, 3D capture, embedded systems, and full-stack work.",
};

/**
 * `?ask=1` — set by the Projects pill — asks the page to answer the question that brought you
 * here before it shows you the answer. Anything else (a bare link, a rail anchor, a refresh, the
 * back button) gets the page on its own. See `src/components/projects/ProjectsIntro.tsx`.
 *
 * `searchParams` is a Promise in this version of Next and makes the page dynamic. That's fine
 * for seven MDX files read through a `cache()`d reader, and it's what buys a server-rendered
 * decision instead of a hydration flash.
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const asked = (await searchParams).ask === "1";
  const projects = getProjects();

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-32 text-center">
        <BackHome />
        <h1 className="font-display text-3xl font-extrabold tracking-tight">No projects yet</h1>
        <p className="mt-3 text-neutral-600">
          Add an <code className="font-mono text-[13px]">.mdx</code> file to{" "}
          <code className="font-mono text-[13px]">content/projects/</code> and it&apos;ll appear
          here.
        </p>
      </div>
    );
  }

  return (
    <>
      <BackHome />

      <ProjectRail projects={projects.map((p) => ({ slug: p.slug, title: p.title }))} />

      <ProjectsReveal projects={projects} asked={asked} />
    </>
  );
}
