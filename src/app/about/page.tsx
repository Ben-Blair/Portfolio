import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { getAllTags } from "@/lib/content";
import { profile } from "@content/profile";
import { resume } from "@content/resume";

export const metadata: Metadata = {
  title: "About",
  description: profile.blurb,
};

export default function AboutPage() {
  const tags = getAllTags();

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-none tracking-[-0.04em]">
            About me
          </h1>
          <p className="mt-3 text-[15px] text-neutral-500">
            {resume.headline} · {profile.location}
          </p>
        </div>
        <div className="relative size-28 shrink-0 sm:size-32">
          <Image
            src={profile.avatar}
            alt={profile.fullName}
            fill
            sizes="128px"
            className="object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
          />
        </div>
      </div>

      <div className="mt-10 space-y-5">
        {profile.about.map((paragraph) => (
          <p key={paragraph} className="text-[17px] leading-relaxed text-neutral-700">
            {paragraph}
          </p>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">
          What I work with
        </h2>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] text-neutral-600"
            >
              {tag}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-3xl border border-neutral-200 bg-neutral-50/60 p-7">
        <h2 className="font-display text-xl font-bold tracking-tight">Elsewhere</h2>
        <ul className="mt-4 space-y-2.5">
          {profile.socials.map((social) => (
            <li key={social.href}>
              <a
                href={social.href}
                target={social.href.startsWith("http") ? "_blank" : undefined}
                rel={social.href.startsWith("http") ? "noreferrer" : undefined}
                className="inline-flex items-center gap-1.5 text-[15px] text-neutral-700 underline-offset-4 hover:text-neutral-900 hover:underline"
              >
                {social.label}
                <ArrowUpRight className="size-3.5 text-neutral-400" />
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            See the projects
          </Link>
          <Link
            href="/resume"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-[14px] font-medium text-neutral-700 transition-colors hover:border-neutral-300"
          >
            Read the resume
          </Link>
        </div>
      </section>
    </div>
  );
}
