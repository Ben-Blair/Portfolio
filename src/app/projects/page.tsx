import type { Metadata } from "next";

import { ProjectRail } from "@/components/projects/ProjectRail";
import { ProjectSection } from "@/components/projects/ProjectSection";
import { BackHome } from "@/components/site/BackHome";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "Computer vision, 3D capture, embedded systems, and full-stack work.",
};

export default function ProjectsPage() {
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

      {/*
        `snap-proximity` rather than `snap-mandatory`: mandatory snapping fights the user on
        trackpads and long sections. This nudges without trapping. It's disabled entirely for
        touch and reduced-motion in globals.css.
      */}
      <div className="snap-y snap-proximity">
        {projects.map((project, index) => (
          <ProjectSection
            key={project.slug}
            project={project}
            index={index}
            total={projects.length}
          />
        ))}
      </div>
    </>
  );
}
