"use client";

import { preconnect } from "react-dom";

/**
 * Getting ready for something the visitor has signalled they want, but hasn't asked for yet.
 *
 * Two mechanisms, because the two things worth warming are nothing alike. A project's video is
 * ours and on our own origin, so the useful thing is the bytes. YouTube's embed is a third party
 * at the end of a cold connection, so the useful thing is the handshake — the bytes can't be
 * fetched ahead of time in any way the iframe would actually reuse.
 *
 * Nothing here imports a component: `PillRow` is mounted on the hero, and reaching this from
 * there must not drag `panels.tsx` — and with it every panel block — into the hero's bundle.
 */

/**
 * Where the Fun panel's embed comes from. Exported because `VideoBlock` builds its iframe URLs
 * from this same constant: a preconnect to a host nothing is requested from looks exactly like a
 * working one, so the two must not be able to drift apart.
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
 * Fun is the one that costs anything: its cut is a YouTube embed, and the iframe only gets its
 * `src` once the panel has finished arriving — see the timers in `ChatView` and the effect in
 * `VideoBlock`. Opening the connection now means that request starts on bytes rather than on a
 * DNS lookup, a TCP handshake and a TLS negotiation.
 *
 * Deliberately *not* a hint in the root layout: a visitor who never opens Fun should never touch
 * a Google-owned host. Intent is the trigger, which is what keeps that true.
 *
 * No `crossOrigin` option, and it matters. The embed is an iframe navigation rather than a CORS
 * fetch, and a `crossorigin` preconnect opens an anonymous-credentials connection keyed
 * differently from the one the navigation will use — the handshake would be paid twice and the
 * hint would buy nothing.
 *
 * One host only. `www.youtube-nocookie.com` serves both the embed document and the player, the
 * media segments come from a `googlevideo.com` subdomain whose name can't be known in advance,
 * and `i.ytimg.com` only serves the click-to-play facade's thumbnail, which this panel doesn't
 * render.
 */
const PANEL_WARM: Record<string, () => void> = {
  fun: () => preconnect(YOUTUBE_EMBED_ORIGIN),
};

/**
 * Warms whatever `panel` needs, if anything. Safe to call repeatedly — React dedupes the hint, so
 * a hover followed by the navigation it predicted costs one `<link>` rather than two.
 */
export function warmPanel(panel: string) {
  PANEL_WARM[panel]?.();
}
