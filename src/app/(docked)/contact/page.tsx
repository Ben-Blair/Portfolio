import type { Metadata } from "next";
import { ArrowUpRight, Mail, Phone } from "lucide-react";

import { BackHome } from "@/components/site/BackHome";
import { formatPhone } from "@/lib/utils";
import { profile } from "@content/profile";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${profile.fullName}.`,
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24">
      <BackHome />

      <h1 className="mt-8 font-display text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-none tracking-[-0.04em]">
        Get in touch
      </h1>

      <div className="mt-5 space-y-4">
        {profile.contact.map((paragraph) => (
          <p key={paragraph} className="text-[17px] leading-relaxed text-neutral-700">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={`mailto:${profile.email}`}
          className="glass-dark inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-[15px] font-medium text-white"
          data-glass
          suppressHydrationWarning
        >
          <Mail className="size-4" />
          {profile.email}
        </a>
        <a
          href={`tel:+1${profile.phone}`}
          className="glass-dark inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-[15px] font-medium text-white"
          data-glass
          suppressHydrationWarning
        >
          <Phone className="size-4" />
          {formatPhone(profile.phone)}
        </a>
      </div>

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
