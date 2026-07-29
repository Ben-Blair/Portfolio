import { ArrowUpRight, Mail } from "lucide-react";

import { profile } from "@content/profile";

import { PanelLink } from "./PanelLink";

/** The Contact panel: the email, the links, and nothing to fill in. */
export function ContactBlock() {
  return (
    <div>
      <p className="text-[15px] leading-relaxed text-neutral-700">
        I&apos;m looking for internships and new-grad roles where I can work on computer vision,
        3D, embedded systems, or anything that touches real hardware. Email is the fastest way to
        reach me — I read everything.
      </p>

      <a
        href={`mailto:${profile.email}`}
        className="glass-dark mt-5 inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-[14.5px] font-medium text-white"
        data-glass
      >
        <Mail className="size-4" />
        {profile.email}
      </a>

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
        {profile.socials.map((social) => (
          <li key={social.href}>
            <a
              href={social.href}
              target={social.href.startsWith("http") ? "_blank" : undefined}
              rel={social.href.startsWith("http") ? "noreferrer" : undefined}
              className="inline-flex items-center gap-1.5 text-[14px] text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
            >
              {social.label}
              <ArrowUpRight className="size-3.5 text-neutral-400" />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <PanelLink href="/contact">The contact page</PanelLink>
      </div>
    </div>
  );
}
