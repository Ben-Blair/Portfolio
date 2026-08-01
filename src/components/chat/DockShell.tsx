"use client";

import { PillRow } from "@/components/chat/PillRow";

/**
 * The bottom dock on every page that isn't the hero: one glass surface holding the site's
 * navigation above its input.
 *
 * These used to be two separate objects — a row of glass tiles floating over a glass capsule,
 * different radii, a gap between them — which read as two components that happened to meet rather
 * than one control. They're the same thing: the row and the field are both ways of asking the
 * site something. So they share a surface, the row is de-glassed inside it (see `PillRow`), and
 * the whole shell lifts on focus rather than just the field.
 *
 * `/chat` and `/projects` both render this so the furniture doesn't move when you cross between
 * them. The hero doesn't — it has room to spread out and a fluid sim worth floating tiles over.
 */
export function DockShell({
  activePanel,
  children,
}: {
  /** Forwarded to `PillRow` so `/chat?panel=…` can mark its pill current. */
  activePanel?: string;
  /** The form. Owned by the caller, because `/chat` answers inline and `/projects` navigates. */
  children: React.ReactNode;
}) {
  return (
    <div
      // Not `rounded-full`: the capsule is two rows tall now, and a full round on that height
      // reads as a stadium rather than a panel. The focus lift keeps `.glass`'s dark hairline and
      // only deepens it, so focusing the input doesn't wipe out the edge the surface is drawn
      // against.
      //
      // `bg-white/50` overrides `.glass`'s 0.2 fill for this one surface. That fill is tuned for
      // the hero, where the tiles float over a pale fluid and nothing has to stay readable through
      // them. The dock is different: whatever the page is scrolls under it, and over a dark
      // screenshot the refraction was smearing colour straight through the pill labels. Half white
      // is the point where the labels hold and the warp is still plainly visible — checked against
      // a project card, not against whitespace, since blank page can't tell the two apart.
      className="glass rounded-[28px] bg-white/50 hover:bg-white/50 focus-within:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.16),0_6px_24px_rgb(0_0_0/0.12)]"
      data-glass
      suppressHydrationWarning
    >
      <PillRow variant="inline" activePanel={activePanel} className="px-2 pt-2" />
      {/* Inset so the divider stops short of the specular rim instead of running into it. */}
      <div className="mx-2 mt-2 border-t border-black/[0.06]" />
      <div className="p-2">{children}</div>
    </div>
  );
}
