"use client";

import { useCallback, useRef } from "react";

import { PillRow } from "@/components/chat/PillRow";
import { cn } from "@/lib/utils";

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
  fieldFocused = false,
  children,
}: {
  /** Forwarded to `PillRow` so `/chat?panel=…` can mark its pill current. */
  activePanel?: string;
  /**
   * Whether the caller's input has focus, which lifts the surface and dims the pill row so the
   * thing you're typing into owns the shell.
   *
   * Passed in rather than read here as `:focus-within`, which was the first attempt and was wrong:
   * the pill row is inside this shell too, so focus-within also fired when you *clicked a pill* —
   * Chrome focuses an anchor on mousedown — and faded the row out from under the thing you had
   * just clicked. `:has(input:focus)` would express it, but the state is already sitting in the
   * caller (both forms track it for the ⌘K hint), and a prop is the version that can be tested
   * without depending on where the browser thinks focus is.
   */
  fieldFocused?: boolean;
  /** The form. Owned by the caller, because `/chat` answers inline and `/projects` navigates. */
  children: React.ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  /**
   * Where the light is. `.glass-sheen` paints a soft radial at `--px`/`--py`; this just says where
   * the cursor is and lets CSS do the rest, so the fade-out on leave is a transition rather than
   * something JS has to animate.
   *
   * Coalesced into one rAF because pointermove fires far faster than the compositor can use, and
   * every one of these writes a custom property that repaints a 200px gradient.
   */
  const trackPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (frame.current) return;
    const { clientX, clientY } = event;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const shell = shellRef.current;
      if (!shell) return;
      const rect = shell.getBoundingClientRect();
      shell.style.setProperty("--px", `${clientX - rect.left}px`);
      shell.style.setProperty("--py", `${clientY - rect.top}px`);
      shell.style.setProperty("--sheen", "1");
    });
  }, []);

  const clearPointer = useCallback(() => {
    shellRef.current?.style.setProperty("--sheen", "0");
  }, []);

  return (
    <div
      ref={shellRef}
      onPointerMove={trackPointer}
      onPointerLeave={clearPointer}
      // Not `rounded-full`: the capsule is two rows tall now, and a full round on that height
      // reads as a stadium rather than a panel. The focus lift keeps `.glass`'s dark hairline and
      // only deepens it, so focusing the input doesn't wipe out the edge the surface is drawn
      // against.
      //
      // `corner-shape: squircle` is what stops that 28px radius reading as a web component. A
      // browser corner is a circular arc, which meets the straight edge at a visible seam; the
      // continuous curve doesn't. It's scoped to this one element rather than added to `.glass`
      // for two reasons: on a `rounded-full` element (the hero field, the prompt chips) a squircle
      // turns a capsule into a blob, and `GlassLayer`'s displacement map is drawn from circular
      // corners in `lib/glass/displacementMap.ts`, so the map and the shape drift apart at the
      // corner. At 28px on a panel this size that drift is a pixel or two; on a pill it wouldn't
      // be. Browsers without the property drop the declaration on the floor, so there's nothing to
      // feature-detect.
      //
      // `bg-white/50` overrides `.glass`'s 0.2 fill for this one surface. That fill is tuned for
      // the hero, where the tiles float over a pale fluid and nothing has to stay readable through
      // them. The dock is different: whatever the page is scrolls under it, and over a dark
      // screenshot the refraction was smearing colour straight through the pill labels. Half white
      // is the point where the labels hold and the warp is still plainly visible — checked against
      // a project card, not against whitespace, since blank page can't tell the two apart.
      //
      // The gradient on top of it is a light source. One flat fill is most of why a translucent
      // panel reads as a sheet of plastic rather than a slab with a top edge; it goes in
      // `background-image` so it composes with that `background-color` instead of replacing it.
      className={cn(
        "glass glass-sheen rounded-[28px] [corner-shape:squircle] bg-white/50 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.16),transparent_45%)] hover:bg-white/50",
        // Both halves of the hover pair, or `.glass:hover` takes the surface back down to 0.5
        // the moment the cursor crosses a focused dock.
        fieldFocused &&
          "bg-white/60 hover:bg-white/60 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.16),0_6px_24px_rgb(0_0_0/0.12)]",
      )}
      data-glass
      suppressHydrationWarning
    >
      {/* Dimmed while the field has focus, so the thing you're typing into owns the surface. */}
      <PillRow
        variant="inline"
        activePanel={activePanel}
        className={cn(
          "px-2 pt-2 transition-opacity duration-200",
          fieldFocused && "opacity-70",
        )}
      />
      {/* Fading at both ends rather than a drawn hairline. A rule that stops dead at each edge is
          a card convention; one that arrives and leaves reads as light catching a step in the
          surface, which is what the seam between these two rows actually is. Inset so it stops
          short of the specular rim instead of running into it. */}
      <div className="mx-2 mt-2 h-px bg-gradient-to-r from-transparent via-black/[0.07] to-transparent" />
      <div className="p-2">{children}</div>
    </div>
  );
}
