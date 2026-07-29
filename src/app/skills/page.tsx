import type { Metadata } from "next";
import Link from "next/link";

import { BackHome } from "@/components/site/BackHome";
import { getAllTags } from "@/lib/content";
import { resume } from "@content/resume";

export const metadata: Metadata = {
  title: "Skills",
  description: "Languages, tools, and technologies I work with.",
};

/**
 * Reads straight off `content/resume.ts` — the grouped `skills` array is the same one the PDF
 * and the resume page use, so there's one place to update.
 */
export default function SkillsPage() {
  const tags = getAllTags();

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <BackHome />

      <h1 className="mt-8 font-display text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-none tracking-[-0.04em]">
        Skills
      </h1>
      <p className="mt-3 text-[15px] text-neutral-500">
        What I reach for, roughly in order of how often I reach for it.
      </p>

      <div className="mt-12 space-y-10">
        {resume.skills.map((group) => (
          <section key={group.group}>
            <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">
              {group.group}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] text-neutral-600"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {tags.length > 0 && (
          <section>
            <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">
              Shows up in my projects
            </h2>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-neutral-100 px-3 py-1.5 text-[13px] text-neutral-600"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-14 flex flex-wrap gap-3">
        <Link
          href="/projects"
          className="glass-dark inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-medium text-white"
          data-glass
        >
          See it in practice
        </Link>
        <Link
          href="/resume"
          className="glass inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-medium text-neutral-700"
          data-glass
        >
          Read the resume
        </Link>
      </div>
    </div>
  );
}
