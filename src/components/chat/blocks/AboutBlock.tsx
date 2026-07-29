import Image from "next/image";

import { profile } from "@content/profile";
import { resume } from "@content/resume";

import { PanelLink } from "./PanelLink";

/** The Me panel: the short version of `/about`, in the same words. */
export function AboutBlock() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0">
          <Image
            src={profile.avatar}
            alt={profile.fullName}
            fill
            sizes="64px"
            className="object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="font-display text-[17px] font-bold tracking-tight text-neutral-900">
            {profile.fullName}
          </p>
          <p className="mt-0.5 text-[13.5px] text-neutral-500">
            {resume.headline} · {profile.location}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        {profile.about.map((paragraph) => (
          <p key={paragraph} className="text-[15px] leading-relaxed text-neutral-700">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        <PanelLink href="/about">More about me</PanelLink>
        <PanelLink href="/resume">Read the resume</PanelLink>
      </div>
    </div>
  );
}
