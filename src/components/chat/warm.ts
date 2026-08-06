"use client";

/**
 * Getting ready for something the visitor has signalled they want, but hasn't asked for yet.
 * Every panel and project video is ours, on our own origin, so the useful thing to warm is always
 * the bytes — see `warmMediaUrl` below.
 *
 * Nothing here imports a component: `PillRow` is mounted on the hero, and reaching this from
 * there must not drag `panels.tsx` — and with it every panel block — into the hero's bundle.
 */

/**
 * Where a project's click-to-play YouTube embed comes from. Exported so `VideoBlock` builds its
 * iframe URLs from the same constant this file would preconnect to, if a panel ever needed that
 * — a third-party host is the one case bytes can't be warmed ahead of time.
 */
export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

/** URLs already warmed this page load — hovering the Projects pill twice shouldn't fetch twice. */
const warmedUrls = new Set<string>();

/**
 * Starts fetching `url` at low priority so it's sitting in the browser's HTTP cache by the time
 * navigation actually lands on `/projects`. Fired from hover/focus on the Projects pill, which is
 * as early a signal of intent as exists short of the click itself.
 *
 * `fetch` rather than `<link rel="preload" as="video">`: preload-for-video support is inconsistent
 * across browsers (notably Safari), while a low-priority fetch reliably warms the cache everywhere
 * and just falls back to a normal-priority one where the hint isn't understood.
 */
export function warmMediaUrl(url: string | undefined) {
  if (!url || warmedUrls.has(url)) return;
  warmedUrls.add(url);
  fetch(url, { priority: "low" }).catch(() => {});
}

/**
 * What each panel wants done before it's opened. A panel with nothing to warm simply isn't here.
 *
 * Fun is the one that costs anything: its cut is ours, on our own origin, so the useful thing is
 * the bytes, fetched the same way `PillRow` warms a project's preview video — see `warmMediaUrl`
 * above.
 */
const PANEL_WARM: Record<string, () => void> = {
  fun: () => {
    warmMediaUrl("/media/fun/summer.mp4");
    warmMediaUrl("/media/fun/poster.jpg");
  },
};

/**
 * Warms whatever `panel` needs, if anything. Safe to call repeatedly — React dedupes the hint, so
 * a hover followed by the navigation it predicted costs one `<link>` rather than two.
 */
export function warmPanel(panel: string) {
  PANEL_WARM[panel]?.();
}
