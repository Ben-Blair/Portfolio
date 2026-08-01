"use client";

import { useEffect, useRef } from "react";

import { buildDisplacementMap, type Corners } from "@/lib/glass/displacementMap";

/**
 * Wires up the refraction behind every `.glass` surface.
 *
 * The visible part of the effect — the frosted white fill, the bright inner rim — is plain CSS in
 * `globals.css`. The part that actually bends the background is an SVG filter, and an SVG filter
 * has to be sized to the exact element it decorates, which CSS can't do on its own.
 *
 * So this component sits once at the root, watches for anything marked `data-glass`, and gives
 * each one its own `<filter>` built to its measured size. Call sites stay ordinary server-rendered
 * markup: `className="glass" data-glass suppressHydrationWarning`. That matters — most of the
 * buttons here are `<Link>`s inside server components, which can't be handed to a client wrapper
 * as a prop.
 *
 * `suppressHydrationWarning` is required on every one of them. This component lives in the root
 * layout, so its effect runs as soon as the layout hydrates — which, with streaming and Suspense,
 * is before the page's own boundaries have hydrated. By then it has already written
 * `--glass-filter` onto elements React is about to hydrate, and React flags the inline style it
 * didn't render as a mismatch. Nothing is actually wrong (React leaves the value alone, and the
 * effect re-syncs anything added later), so the flag is what needs silencing. It's shallow: it
 * covers the element's own attributes, not its children.
 *
 * Per-element overrides, both optional and rarely needed — the defaults scale themselves to the
 * element, so a tag chip and the chat panel both get a lens in proportion to their own size:
 *   data-glass-bevel  how far in from the edge the refraction reaches, in px
 *   data-glass-scale  how hard it bends (default derived from the bevel)
 *
 * Chromium honours SVG filters in `backdrop-filter`; Safari and Firefox drop them and fall back
 * to the plain frosted blur declared alongside. See the note in `globals.css`.
 */

/**
 * Default bevel as a fraction of the element's short edge, clamped to this px range.
 *
 * Proportional rather than a flat number because a 28px tag chip and a 300px chat panel need
 * very different bevels to read as the same material — a fixed px bevel makes the small ones
 * look like thick slabs and the large ones look like flat panes with a scratch round the edge.
 */
const BEVEL_RATIO = 0.22;
const BEVEL_MIN = 7;
const BEVEL_MAX = 26;

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * How far the red and blue channels are pushed either side of green, as a fraction of the
 * displacement scale. Thick glass disperses, so a refracted edge splits into faint colour
 * fringes — that split is most of what separates "glass" from "a blur". Keep it small; past
 * ~0.1 it stops reading as dispersion and starts reading as a broken filter.
 *
 * Set to 0 to collapse the three passes back to one visually, without touching the chain.
 */
const DISPERSION = 0.1;

type Entry = {
  id: string;
  filter: SVGFilterElement;
  image: SVGFEImageElement;
  /** One displacement pass per channel, red first — see `createEntry` for why there are three. */
  displacements: SVGFEDisplacementMapElement[];
  /** Geometry the filter was last built for, so resizes that change nothing are free. */
  key: string;
};

/** Reads one corner radius, resolving percentages and Tailwind's effectively-infinite `rounded-full`. */
function readRadius(value: string, width: number, height: number): number {
  const limit = Math.min(width, height) / 2;
  const parsed = value.endsWith("%")
    ? (parseFloat(value) / 100) * Math.min(width, height)
    : parseFloat(value);

  if (!Number.isFinite(parsed)) return limit;
  return Math.min(Math.max(parsed, 0), limit);
}

function readCorners(style: CSSStyleDeclaration, width: number, height: number): Corners {
  return {
    topLeft: readRadius(style.borderTopLeftRadius, width, height),
    topRight: readRadius(style.borderTopRightRadius, width, height),
    bottomRight: readRadius(style.borderBottomRightRadius, width, height),
    bottomLeft: readRadius(style.borderBottomLeftRadius, width, height),
  };
}

export function GlassLayer() {
  const defsRef = useRef<SVGDefsElement>(null);

  useEffect(() => {
    const defs = defsRef.current;
    if (!defs) return;

    // Nothing to build if the reader has asked for less transparency — the CSS goes opaque and
    // the filter would never be sampled.
    if (window.matchMedia?.("(prefers-reduced-transparency: reduce)").matches) return;

    const entries = new Map<Element, Entry>();
    let nextId = 0;

    // Retina gets a supersampled map so the ramp stays smooth; past 2x it isn't worth the pixels.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    function createEntry(): Entry {
      const id = `glass-${nextId++}`;

      const filter = document.createElementNS(SVG_NS, "filter");
      filter.setAttribute("id", id);
      // Without sRGB the browser converts to linear light first and the 128-is-neutral
      // assumption the map is built on stops holding.
      filter.setAttribute("color-interpolation-filters", "sRGB");
      // Pin the filter region to the element's own box in px, so no percentage resolution or
      // the default 10% bleed can shift the map off the shape it was drawn for.
      filter.setAttribute("filterUnits", "userSpaceOnUse");

      const image = document.createElementNS(SVG_NS, "feImage");
      image.setAttribute("result", "map");
      image.setAttribute("preserveAspectRatio", "none");
      filter.append(image);

      // Three displacement passes off one map, at slightly different strengths, each stripped
      // down to a single colour channel and then added back together. Red bends most, blue
      // least, so a hard edge in the backdrop comes out of the rim with a warm fringe on one
      // side and a cool one on the other — dispersion, the way a real lens does it.
      //
      // All three read the same `map`, so `buildDisplacementMap`'s canvas work and its cache are
      // untouched by this. The extra cost is GPU filter passes only.
      const displacements: SVGFEDisplacementMapElement[] = [];

      // Four rows of five, `[r g b a offset]` each: keep one channel, drop the other two, pass
      // alpha through untouched.
      const isolateMatrix = {
        R: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
        G: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
        B: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
      } as const;

      (["R", "G", "B"] as const).forEach((channel) => {
        const displacement = document.createElementNS(SVG_NS, "feDisplacementMap");
        displacement.setAttribute("in", "SourceGraphic");
        displacement.setAttribute("in2", "map");
        // The map itself always steers with R for x and G for y — that's how it was drawn.
        // `channel` here is about which colour we keep afterwards, not how we sample.
        displacement.setAttribute("xChannelSelector", "R");
        displacement.setAttribute("yChannelSelector", "G");
        displacement.setAttribute("result", `disp${channel}`);

        // Zero every channel but this one, keeping alpha, so the three can simply be summed.
        const isolate = document.createElementNS(SVG_NS, "feColorMatrix");
        isolate.setAttribute("in", `disp${channel}`);
        isolate.setAttribute("type", "matrix");
        isolate.setAttribute("values", isolateMatrix[channel]);
        isolate.setAttribute("result", `channel${channel}`);

        filter.append(displacement, isolate);
        displacements.push(displacement);
      });

      // `screen` rather than `feComposite` arithmetic: the channels are disjoint so screen sums
      // them exactly, and it doesn't care whether the browser hands us premultiplied colour.
      const blendRG = document.createElementNS(SVG_NS, "feBlend");
      blendRG.setAttribute("in", "channelR");
      blendRG.setAttribute("in2", "channelG");
      blendRG.setAttribute("mode", "screen");
      blendRG.setAttribute("result", "channelRG");

      const blendRGB = document.createElementNS(SVG_NS, "feBlend");
      blendRGB.setAttribute("in", "channelRG");
      blendRGB.setAttribute("in2", "channelB");
      blendRGB.setAttribute("mode", "screen");
      blendRGB.setAttribute("result", "recombined");

      // Screening three layers together drives alpha toward 1 wherever any of them is opaque.
      // The backdrop is opaque in practice, but clip back to the source's alpha so the filter
      // stays correct if it ever isn't.
      const restoreAlpha = document.createElementNS(SVG_NS, "feComposite");
      restoreAlpha.setAttribute("in", "recombined");
      restoreAlpha.setAttribute("in2", "SourceGraphic");
      restoreAlpha.setAttribute("operator", "in");

      filter.append(blendRG, blendRGB, restoreAlpha);
      defs!.append(filter);

      return { id, filter, image, displacements, key: "" };
    }

    function update(el: Element) {
      const entry = entries.get(el);
      if (!entry) return;

      const rect = el.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width < 2 || height < 2) return;

      const style = getComputedStyle(el);
      const corners = readCorners(style, width, height);

      const shortEdge = Math.min(width, height);
      const bevelAttr = Number(el.getAttribute("data-glass-bevel"));
      const bevel = Math.min(
        Number.isFinite(bevelAttr) && bevelAttr > 0
          ? bevelAttr
          : Math.min(Math.max(shortEdge * BEVEL_RATIO, BEVEL_MIN), BEVEL_MAX),
        shortEdge / 2,
      );

      const scaleAttr = Number(el.getAttribute("data-glass-scale"));
      // feDisplacementMap offsets by up to scale/2 px, so this pulls the rim by ~1.9×bevel.
      //
      // This multiplier used to be 1.4, which put the maximum offset at ~7px on a standard pill.
      // That is not enough to see: the backdrop only moves by a few pixels, and the blur in
      // `backdrop-filter` then smooths the difference away, so the surface read as a plain
      // frosted panel. Measured against a hard-edged test pattern, the lensing only becomes
      // legible somewhere north of 2×, and the colour fringing needs the same room. It sits at
      // 3.8× so the rim still reads as a lens through the wider frost blur in `globals.css`.
      const scale = Number.isFinite(scaleAttr) && scaleAttr > 0 ? scaleAttr : bevel * 3.8;

      const key = `${width}x${height}:${bevel}:${scale}:${Object.values(corners).join(",")}`;
      if (key === entry.key) return;
      entry.key = key;

      const map = buildDisplacementMap({ width, height, corners, bevel, pixelRatio });
      if (!map) return;

      entry.filter.setAttribute("x", "0");
      entry.filter.setAttribute("y", "0");
      entry.filter.setAttribute("width", String(width));
      entry.filter.setAttribute("height", String(height));

      entry.image.setAttribute("href", map);
      entry.image.setAttribute("x", "0");
      entry.image.setAttribute("y", "0");
      entry.image.setAttribute("width", String(width));
      entry.image.setAttribute("height", String(height));

      // Red bends hardest, blue least. Same order the passes were appended in.
      const spread = [1 + DISPERSION, 1, 1 - DISPERSION];
      entry.displacements.forEach((displacement, index) => {
        displacement.setAttribute("scale", String(scale * spread[index]));
      });

      (el as HTMLElement).style.setProperty("--glass-filter", `url(#${entry.id})`);
    }

    const resizeObserver = new ResizeObserver((observed) => {
      for (const { target } of observed) update(target);
    });

    function sync() {
      const found = new Set(document.querySelectorAll("[data-glass]"));

      for (const el of found) {
        if (entries.has(el)) continue;
        entries.set(el, createEntry());
        // border-box, because that's the box the filter is sized to — a padding change with no
        // content reflow would otherwise slip past.
        resizeObserver.observe(el, { box: "border-box" });
        update(el);
      }

      // Chat answers and prompt chips come and go; drop their filters with them.
      for (const [el, entry] of entries) {
        if (found.has(el)) continue;
        resizeObserver.unobserve(el);
        entry.filter.remove();
        entries.delete(el);
      }
    }

    sync();

    const mutationObserver = new MutationObserver(sync);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      for (const entry of entries.values()) entry.filter.remove();
      entries.clear();
    };
  }, []);

  return (
    <svg aria-hidden className="pointer-events-none fixed size-0" focusable="false">
      <defs ref={defsRef} />
    </svg>
  );
}
