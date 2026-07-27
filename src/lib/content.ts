import "server-only";

import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";

import { projectFrontmatterSchema, type Project } from "./schema";

const PROJECTS_DIR = path.join(process.cwd(), "content", "projects");

/**
 * Reads every `content/projects/*.mdx`, validates its frontmatter, and returns them sorted.
 *
 * A malformed file throws at build time with the filename and the offending field, rather
 * than silently rendering an empty section.
 */
export const getProjects = cache((): Project[] => {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  const projects = fs
    .readdirSync(PROJECTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(PROJECTS_DIR, file), "utf8");
      const { data, content } = matter(raw);

      const parsed = projectFrontmatterSchema.safeParse(data);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("\n");
        throw new Error(
          `Invalid frontmatter in content/projects/${file}:\n${issues}\n\n` +
            `See src/lib/schema.ts for the expected shape.`,
        );
      }

      return { ...parsed.data, slug, body: content.trim() } satisfies Project;
    })
    .filter((project) => !project.draft);

  return projects.sort(
    (a, b) => a.order - b.order || b.date.localeCompare(a.date),
  );
});

export const getProject = cache((slug: string): Project | undefined =>
  getProjects().find((project) => project.slug === slug),
);

export const getFeaturedProjects = cache((): Project[] =>
  getProjects().filter((project) => project.featured),
);

/** Every tag in use, most-used first. Powers the filter row. */
export const getAllTags = cache((): string[] => {
  const counts = new Map<string, number>();
  for (const project of getProjects()) {
    for (const tag of project.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
});
