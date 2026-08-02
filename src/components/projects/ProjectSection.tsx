"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MediaBlock } from "@/components/media/MediaBlock";
import { Step, useArrival } from "@/components/projects/reveal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/schema";

/**
 * The section's arrival, which is the Me panel's header timing with the parts renamed.
 *
 * The two are the same shape — a picture beside a name, a line or two under it, a row of chips,
 * then the links — so they get the same numbers rather than a second set that happens to look
 * similar. `src/components/chat/blocks/AboutBlock.tsx` is where these were chosen and why.
 *
 * Three beats, not five: the title, then the body, then the buttons. The section is two columns and
 * a beat can be spent in either, so more beats than that means the eye is sent across the gap and
 * back again — a beat per element reads as a list animating itself rather than a thing assembling.
 */

/** How long the title takes to become legible. Also when the line under it starts. */
const TITLE_FADE_MS = 480;

/** How long it keeps travelling after that. Longer than the fade, and the reason for both. */
const TITLE_LIFT_MS = 760;

/**
 * The body: the picture on one side, and the description and chips on the other.
 *
 * One beat spanning both columns, which is the point. The picture and the sentence about it are the
 * same statement told twice, and the sentence is what tells you what you're looking at — so they
 * have to appear together or the picture spends the gap being an unexplained image. Split across
 * two beats it read as two events in two places; on one it reads as the section showing you the
 * project.
 *
 * The chips ride along, still in the description's own step: same sentence in the other register,
 * for the reader who takes the six words instead of the paragraph.
 *
 * It's a head start in reverse against the title — enough to read as following it, not racing it.
 * Three elements in two columns, so these numbers are shared by all three rather than merely equal:
 * the sync is the requirement, and separate constants that happened to match would be a thing to
 * keep matching forever.
 */
const BODY_DELAY_MS = 180;
const BODY_FADE_MS = 480;
const BODY_LIFT_MS = 760;

/**
 * The buttons, which close the section out.
 *
 * They come up while the body is still fading and finish on the frame it stops moving, so the
 * section lands complete in one instant instead of trailing a last row behind it. Both numbers fall
 * out of the lead: the landing is fixed, so starting earlier only means fading longer.
 */
const ACTIONS_LEAD_MS = 280;
const ACTIONS_START_MS = BODY_DELAY_MS + BODY_FADE_MS - ACTIONS_LEAD_MS;
const ACTIONS_FADE_MS = BODY_LIFT_MS - (ACTIONS_START_MS - BODY_DELAY_MS);

/** When everything that travels has stopped travelling. */
const SETTLED_MS = BODY_DELAY_MS + BODY_LIFT_MS;

/**
 * The accent wash, timed to the whole arrival rather than to any step in it. It's a background,
 * it's at 5.5% opacity, and turning it on in one frame would be the only cut in a section that's
 * otherwise entirely made of fades.
 */
const TINT_FADE_MS = SETTLED_MS;

/**
 * Every section after the first: one plain fade, all of it, at once.
 *
 * The staged arrival above earns its keep on the first section, which is the only one guaranteed
 * to be seen arriving — it's on screen from the first frame, so the part-by-part sequence actually
 * plays. Every section past it reaches the screen mid-scroll, at a moment the visitor is already
 * moving forward, so it's on screen before it's read; a title arriving, then a picture, then a
 * button row reads as the page stuttering into place rather than as an assembly you'd sit and
 * watch. No `liftMs` here either — a lift is a small trip for the eye to follow, and with six
 * elements moving at once there's no single thing to follow it to.
 */
const SIMPLE_FADE_MS = 480;

/**
 * One section of the /projects list.
 *
 * Media and copy alternate sides down the page so it doesn't read as a list of identical
 * rows. The section is tinted with the project's own `accent`.
 *
 * It arrives a part at a time, in the order you'd read it, once it reaches the screen — the same
 * staging the Me panel uses, on the grounds that seven of these are the answer to the same kind of
 * question and shouldn't answer it in a different voice. What's staged is appearance only: every
 * step holds its space from the first render, so nothing here can reflow a page mid-scroll. See
 * `./reveal.tsx`.
 */
export function ProjectSection({
  project,
  index,
  total,
  ready,
  onSettled,
}: {
  project: Project;
  index: number;
  total: number;
  /** Whether the page is done with whatever was above this list. See `ProjectsReveal`. */
  ready: boolean;
  /**
   * Fired with this section's own `index` once it's far enough along to hand off, not when it
   * starts. `ProjectsReveal` holds the next section's `ready` on this rather than on scroll
   * position, so a section two below the fold can't start fading in while the one above it is
   * still arriving — which is what a purely scroll-driven trigger would allow on a fast scroll or a
   * short section.
   *
   * "Far enough along" isn't "finished": the staged first section hands off when its actions row
   * starts appearing (`ACTIONS_START_MS`), not once its title and body are done travelling
   * (`SETTLED_MS`) — waiting for the full settle read as a pause between the two sections rather
   * than the second picking up off the first. Every later section is one plain fade with nothing
   * left to wait out, so its handoff is just that fade finishing.
   *
   * Takes the index rather than closing over nothing so `ProjectsReveal` can hand every section the
   * same `useCallback`-stable function. An inline closure recreated per render would retrigger the
   * effect below on every unrelated re-render — harmless once armed, but it'd keep resetting the
   * handoff timer and the section it gates would never actually unlock.
   */
  onSettled?: (index: number) => void;
}) {
  const flipped = index % 2 === 1;
  const hero = project.media[0];
  const { ref, armed, skipSettle } = useArrival(ready);
  // See `SIMPLE_FADE_MS`: only the first section gets the part-by-part sequence.
  const staged = index === 0;

  // Guarded the same way `ProjectsIntro` guards its own `onSettled`: `armed` is a latch (see
  // `useArrival`), so this only ever needs to fire once per section.
  const settled = useRef(false);
  useEffect(() => {
    if (!armed || settled.current || !onSettled) return;
    if (skipSettle) {
      settled.current = true;
      onSettled(index);
      return;
    }
    const duration = staged ? ACTIONS_START_MS : SIMPLE_FADE_MS;
    const timer = window.setTimeout(() => {
      settled.current = true;
      onSettled(index);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [armed, skipSettle, onSettled, staged, index]);

  return (
    <section
      id={project.slug}
      className={cn(
        "relative flex items-center overflow-hidden pb-10 sm:pb-14",
        // Lines the first title up with the "me" panel's, which sits `pt-28`/`sm:pt-32` below the
        // collapsed turn above it. Replacing rather than adding to the usual `pt-10`/`sm:pt-14`:
        // Tailwind emits responsive utilities after plain ones regardless of source order, so a
        // bare `pt-12` here would lose to `sm:py-14` above 640px and do nothing.
        index === 0 ? "pt-28 sm:pt-32" : "pt-10 sm:pt-14",
      )}
      style={
        {
          // Consumed by the tint layer below; keeps the accent out of every child class.
          "--accent": project.accent,
        } as React.CSSProperties
      }
    >
      {/* The wash's own opacity stays on the inner element: `.reveal-fade` animates the step from
          transparent to fully opaque, so an `opacity-*` utility on the same node is something the
          animation overwrites on its first frame. */}
      <Step
        armed={armed}
        fadeMs={staged ? TINT_FADE_MS : SIMPLE_FADE_MS}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          aria-hidden
          className="size-full opacity-[0.055]"
          style={{
            background: `radial-gradient(70% 60% at ${flipped ? "80%" : "20%"} 40%, var(--accent), transparent 70%)`,
          }}
        />
      </Step>

      {/* The row is what's watched, and it's also why the steps below can't be the grid's children
          directly: each column has to stay one grid item, so the media's step *is* its column and
          the copy's steps sit inside its own. */}
      <div
        ref={ref}
        className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 md:grid-cols-2 md:gap-14"
      >
        {/* Half of the body beat. The other half is the description across the gap, on the same
            three numbers — see `BODY_*`. Two elements in two columns arriving as one movement,
            which is what keeps a picture this size from reading as the layout still settling. */}
        <Step
          armed={armed}
          fadeMs={staged ? BODY_FADE_MS : SIMPLE_FADE_MS}
          liftMs={staged ? BODY_LIFT_MS : undefined}
          delayMs={staged ? BODY_DELAY_MS : 0}
          className={cn("min-w-0", flipped && "md:order-2")}
        >
          {hero ? (
            <MediaBlock media={hero} />
          ) : (
            <div className="aspect-[16/10] w-full rounded-2xl border border-neutral-200 bg-neutral-50" />
          )}
        </Step>

        <div className={cn("min-w-0", flipped && "md:order-1")}>
          {/* The counter belongs to the title, not to itself: it's a label for the thing under it,
              and a number arriving on its own beat would be the page counting at you. */}
          <Step
            armed={armed}
            fadeMs={staged ? TITLE_FADE_MS : SIMPLE_FADE_MS}
            liftMs={staged ? TITLE_LIFT_MS : undefined}
          >
            <p className="mb-4 font-mono text-[12px] tracking-widest text-neutral-400">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              {project.status && <span className="ml-3 normal-case">{project.status}</span>}
            </p>

            <h2 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-neutral-900">
              {project.title}
            </h2>
          </Step>

          {/* The other half of the body beat, in lockstep with the picture beside it. */}
          <Step
            armed={armed}
            fadeMs={staged ? BODY_FADE_MS : SIMPLE_FADE_MS}
            liftMs={staged ? BODY_LIFT_MS : undefined}
            delayMs={staged ? BODY_DELAY_MS : 0}
            className="mt-4"
          >
            <p className="max-w-prose text-[17px] leading-relaxed text-neutral-600">
              {project.tagline}
            </p>

            <ul className="mt-6 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="secondary" className="rounded-full font-normal">
                    {tag}
                  </Badge>
                </li>
              ))}
            </ul>
          </Step>

          {/* Fades without travelling. The block above is still moving, and a second thing in
              motion under it reads as the column not knowing where it means to settle. */}
          <Step
            armed={armed}
            fadeMs={staged ? ACTIONS_FADE_MS : SIMPLE_FADE_MS}
            delayMs={staged ? ACTIONS_START_MS : 0}
            className="mt-8"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/projects/${project.slug}`}
                className="glass-dark inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-medium text-white"
                data-glass
                suppressHydrationWarning
              >
                Read more
                <ArrowUpRight className="size-4" />
              </Link>

              {project.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="glass inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-medium text-neutral-700"
                  data-glass
                  suppressHydrationWarning
                >
                  {link.label}
                  <ArrowUpRight className="size-4 text-neutral-400" />
                </a>
              ))}
            </div>
          </Step>
        </div>
      </div>
    </section>
  );
}
