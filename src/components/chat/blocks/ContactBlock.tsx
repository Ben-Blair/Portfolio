import { ArrowUpRight, Mail } from "lucide-react";

import { Fade, Typed } from "@/components/chat/reveal";
import { profile } from "@content/profile";

import { PanelLink } from "./PanelLink";

/**
 * The Contact panel: the email, the links, and nothing to fill in.
 *
 * The one that opens with prose. It types, and then the address and the links land under it —
 * which is the order the sentence sets up anyway.
 */
export function ContactBlock() {
  return (
    <div>
      <Typed step={0} text={profile.contact.join("\n\n")} />

      <Fade step={1} className="mt-5">
        <a
          href={`mailto:${profile.email}`}
          className="glass-dark inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-[14.5px] font-medium text-white"
          data-glass
          suppressHydrationWarning
        >
          <Mail className="size-4" />
          {profile.email}
        </a>
      </Fade>

      <Fade step={2} className="mt-6">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
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
      </Fade>
    </div>
  );
}
