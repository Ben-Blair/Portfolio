import { ChatDock } from "@/components/hero/ChatDock";

/**
 * Every page that isn't the hero or `/chat`, with the dock pinned under it.
 *
 * The pills are the site's only navigation, so a page without them is a dead end — you could
 * arrive at `/skills` from the chat and then have nothing but the browser's back button. A route
 * group rather than a wrapper each page renders: the dock is a property of being a sub-page, not
 * something six files should each have to remember. `(docked)` is parentheses, so none of this
 * shows up in a URL — `/skills` is still `/skills`.
 *
 * Out of the group on purpose: `/` spreads the same pills out below its own input, and `/chat`
 * renders the dock itself because its input answers inline instead of navigating.
 *
 * `min-h-dvh` with a `flex-1` content column is what makes `sticky` behave on a short page like
 * `/contact`: without it the dock comes to rest directly under the last paragraph, halfway up the
 * screen. With it the column always fills the viewport, so the dock is either pinned to the
 * bottom edge or riding the end of long content — never stranded in the middle.
 *
 * Sticky rather than fixed, so it can't cover the end of the page.
 */
export default function DockedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1">{children}</div>

      {/* The wrapper fades instead of laying down an opaque plate: the dock's glass needs page
          content passing under it to have anything to refract, and a white slab is the one
          backdrop that makes the material disappear. No blur here either — the dock does its own,
          and blurring twice flattens it. `dock-scrim` (globals.css) is an eased ramp rather than a
          straight one, so the fade has no visible seam.

          `pointer-events-none` on the wrapper, `pointer-events-auto` back on for the dock itself:
          the fade's top ~40px (`pt-10`) reads as empty, but the box is still there and, without
          this, still catches clicks meant for whatever's underneath it — a button near the bottom
          of a section becomes unclickable until you scroll it past the transparent part of the
          gradient. */}
      <div className="dock-scrim pointer-events-none sticky bottom-0 z-30 px-5 pb-5 pt-10">
        <div className="pointer-events-auto mx-auto flex max-w-2xl justify-center">
          <ChatDock variant="bar" />
        </div>
      </div>
    </div>
  );
}
