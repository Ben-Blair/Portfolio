import { ChatDock } from "@/components/hero/ChatDock";

/**
 * Every page that isn't the hero or `/chat`, with the dock pinned under it.
 *
 * The pills are the site's only navigation, so a page without them is a dead end — you could
 * arrive at `/skills` from the chat and then have nothing but the browser's back button. A route
 * group rather than a wrapper each page renders: the dock is a property of being a sub-page, not
 * something six files should each have to remember. `(docked)` is parentheses, so none of this
 * shows up in a URL — `/about` is still `/about`.
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
          and blurring twice flattens it. */}
      <div className="sticky bottom-0 z-30 bg-gradient-to-t from-white via-white/85 to-transparent px-5 pb-5 pt-10">
        <div className="mx-auto flex max-w-2xl justify-center">
          <ChatDock variant="bar" />
        </div>
      </div>
    </div>
  );
}
