import { Fade, Typed } from "@/components/chat/reveal";
import { profile } from "@content/profile";

import { PanelLink } from "./PanelLink";

/**
 * The Fun panel. Content lives in `profile.fun`, same as `/fun`.
 *
 * Each card lands with its title and then writes itself, so the three read as three separate
 * thoughts rather than a list that appeared. Steps come off the index — a fourth item needs no
 * renumbering, it just makes the script two steps longer.
 */
export function FunBlock() {
  return (
    <div>
      <div className="space-y-3">
        {profile.fun.map((item, index) => (
          <Fade key={item.title} step={index * 2}>
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h3 className="mb-2 font-display text-[16px] font-bold tracking-tight text-neutral-900">
                {item.title}
              </h3>
              <Typed step={index * 2 + 1} text={item.body} />
            </section>
          </Fade>
        ))}
      </div>

      <Fade step={profile.fun.length * 2} className="mt-6">
        <PanelLink href="/fun">The longer version</PanelLink>
      </Fade>
    </div>
  );
}
