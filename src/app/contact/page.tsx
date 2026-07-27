import type { Metadata } from "next";
import { ArrowUpRight, Mail } from "lucide-react";

import { profile } from "@content/profile";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${profile.fullName}.`,
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24">
      <h1 className="font-display text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-none tracking-[-0.04em]">
        Get in touch
      </h1>

      <p className="mt-5 text-[17px] leading-relaxed text-neutral-700">
        I&apos;m looking for internships and new-grad roles where I can work on computer vision,
        3D, embedded systems, or anything that touches real hardware. If that&apos;s you,
        I&apos;d like to hear about it.
      </p>

      <p className="mt-4 text-[17px] leading-relaxed text-neutral-700">
        Email is the fastest way to reach me. I read everything.
      </p>

      <a
        href={`mailto:${profile.email}`}
        className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-neutral-900 px-6 py-3.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Mail className="size-4" />
        {profile.email}
      </a>

      <div className="mt-14 border-t border-neutral-200 pt-8">
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-neutral-400">
          Elsewhere
        </h2>
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
      </div>
    </div>
  );
}
