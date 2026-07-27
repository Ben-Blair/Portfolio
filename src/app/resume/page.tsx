import type { Metadata } from "next";
import { Download, ExternalLink } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { profile } from "@content/profile";
import { resume } from "@content/resume";

export const metadata: Metadata = {
  title: "Resume",
  description: resume.summary,
};

/**
 * Both a readable HTML resume (selectable, printable, indexable by search engines and by
 * whatever bot a recruiter is running) and the actual PDF.
 *
 * To update: overwrite `public/BenjaminBlair_Resume.pdf` and edit `content/resume.ts`.
 */
export default function ResumePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-none tracking-[-0.04em]">
            Resume
          </h1>
          <p className="mt-3 text-[15px] text-neutral-500">
            {resume.headline} · Updated {resume.updated}
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href={resume.pdf}
            download={resume.downloadAs}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2.5 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Download className="size-3.5" />
            Download PDF
          </a>
          <a
            href={resume.pdf}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2.5 text-[13.5px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <ExternalLink className="size-3.5 text-neutral-400" />
            Open
          </a>
        </div>
      </header>

      <Separator className="my-10" />

      <section>
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">
          Summary
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-neutral-700">{resume.summary}</p>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">
          Education
        </h2>
        <ul className="mt-4 space-y-5">
          {resume.education.map((entry) => (
            <li key={entry.school}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="font-display text-[17px] font-bold text-neutral-900">
                  {entry.school}
                </p>
                <p className="font-mono text-[12.5px] text-neutral-400">
                  {entry.start} – {entry.end}
                </p>
              </div>
              <p className="mt-0.5 text-[15px] text-neutral-600">
                {entry.degree}
                {entry.detail && <span className="text-neutral-400"> · {entry.detail}</span>}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">
          Experience
        </h2>
        <ul className="mt-4 space-y-7">
          {resume.experience.map((entry) => (
            <li key={`${entry.org}-${entry.role}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="font-display text-[17px] font-bold text-neutral-900">
                  {entry.role} ·{" "}
                  {entry.href ? (
                    <a
                      href={entry.href}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
                    >
                      {entry.org}
                    </a>
                  ) : (
                    entry.org
                  )}
                </p>
                <p className="font-mono text-[12.5px] text-neutral-400">
                  {entry.start} – {entry.end}
                </p>
              </div>
              <ul className="mt-2 space-y-1.5">
                {entry.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="relative pl-4 text-[15px] leading-relaxed text-neutral-600 before:absolute before:left-0 before:top-[0.65em] before:size-1 before:rounded-full before:bg-neutral-300"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">
          Selected Projects
        </h2>
        <ul className="mt-4 space-y-7">
          {resume.projects.map((entry) => (
            <li key={entry.name}>
              <p className="font-display text-[17px] font-bold text-neutral-900">{entry.name}</p>
              <p className="mt-0.5 text-[13.5px] italic text-neutral-500">{entry.stack}</p>
              <ul className="mt-2 space-y-1.5">
                {entry.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="relative pl-4 text-[15px] leading-relaxed text-neutral-600 before:absolute before:left-0 before:top-[0.65em] before:size-1 before:rounded-full before:bg-neutral-300"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">Skills</h2>
        <dl className="mt-4 space-y-4">
          {resume.skills.map((group) => (
            <div key={group.group}>
              <dt className="text-[13px] font-semibold text-neutral-900">{group.group}</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-neutral-200 px-2.5 py-1 text-[12.5px] text-neutral-600"
                  >
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">
          The PDF
        </h2>
        <object
          data={resume.pdf}
          type="application/pdf"
          className="mt-4 h-[80vh] w-full rounded-2xl border border-neutral-200"
        >
          <p className="p-6 text-[15px] text-neutral-600">
            Your browser can&apos;t display PDFs inline.{" "}
            <a href={resume.pdf} download={resume.downloadAs} className="underline">
              Download it instead
            </a>
            .
          </p>
        </object>
        <p className="mt-4 text-[14px] text-neutral-500">
          Questions about any of this? Email me at{" "}
          <a
            href={`mailto:${profile.email}`}
            className="text-neutral-900 underline underline-offset-4"
          >
            {profile.email}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
