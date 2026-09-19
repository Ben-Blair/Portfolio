import { ProjectsTurnFrame } from "@/components/projects/ProjectsTurnFrame";

/**
 * What `/projects` shows while it's being fetched.
 *
 * Here for what declaring it does as much as for what it draws. `page.tsx` awaits `searchParams`,
 * which makes the route dynamic, and Next won't prefetch a dynamic route *unless* it has a loading
 * boundary — without this file the Projects pill bought a round trip with a blank page on the
 * other side of it. With it, the shell below is prefetched and paints on the click.
 *
 * It also covers `/projects/[slug]`, which is why `ProjectsTurnFrame` renders nothing unless a
 * turn was armed: those pages are prerendered and prefetched whole, and they never asked a
 * question. Their prefetch is unaffected — measured at 21.6KB before this file and 21.9KB after.
 */
export default function Loading() {
  return <ProjectsTurnFrame />;
}
