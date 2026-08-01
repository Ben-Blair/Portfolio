import { Fade } from "@/components/chat/reveal";
import { resume } from "@content/resume";

import { PanelLink } from "./PanelLink";

/**
 * The Skills panel. Same grouped list as `/skills` and the PDF — `content/resume.ts`.
 *
 * The only panel with nothing to type. It's a label and a set of chips, and there's no sentence
 * in it to write out — so the groups just cascade in, one after another.
 */
export function SkillsBlock() {
  return (
    <div>
      <div className="space-y-6">
        {resume.skills.map((group, index) => (
          <Fade key={group.group} step={index}>
            <section>
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-400">
                {group.group}
              </h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[13px] text-neutral-600"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </Fade>
        ))}
      </div>

      <Fade step={resume.skills.length} className="mt-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <PanelLink href="/skills">The full list</PanelLink>
          <PanelLink href="/projects">See it in practice</PanelLink>
        </div>
      </Fade>
    </div>
  );
}
