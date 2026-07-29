import { profile } from "@content/profile";

import { PanelLink } from "./PanelLink";

/** The Fun panel. Content lives in `profile.fun`, same as `/fun`. */
export function FunBlock() {
  return (
    <div>
      <div className="space-y-3">
        {profile.fun.map((item) => (
          <section key={item.title} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="font-display text-[16px] font-bold tracking-tight text-neutral-900">
              {item.title}
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-neutral-600">{item.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-6">
        <PanelLink href="/fun">The longer version</PanelLink>
      </div>
    </div>
  );
}
