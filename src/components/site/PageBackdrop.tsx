/**
 * The wash behind every page that isn't the hero.
 *
 * This exists for the glass, not for its own sake. `.glass` surfaces refract, blur and saturate
 * whatever sits behind them, and over a flat `bg-white` all three of those are no-ops — bending
 * white gives you white, so the pills on `/skills`, `/resume` and the rest collapsed into plain
 * tinted shapes. Giving them a field with some colour and some gradient structure in it is what
 * makes the refraction visible at all.
 *
 * Deliberately not the hero's fluid sim: that's a WebGL context and a rendering loop, and body
 * copy sits directly on this. Static radial gradients cost nothing and don't move under text.
 *
 * The blobs are far larger than the viewport and low-alpha, so the falloff is slow and no
 * gradient edge is ever visible — it should register as "the page isn't quite white" rather than
 * as a pattern. `fixed` so it doesn't slide around under the glass while scrolling.
 */
import { PAGE_BACKDROP_IMAGE } from "@/components/site/backdrop";

/**
 * The wash behind every page that isn't the hero.
 *
 * This exists for the glass, not for its own sake. `.glass` surfaces refract, blur and saturate
 * whatever sits behind them, and over a flat `bg-white` all three of those are no-ops — bending
 * white gives you white, so the pills on `/skills`, `/resume` and the rest collapsed into plain
 * tinted shapes. Giving them a field with some colour and some gradient structure in it is what
 * makes the refraction visible at all.
 *
 * Deliberately not the hero's fluid sim: that's a WebGL context and a rendering loop, and body
 * copy sits directly on this. Static radial gradients cost nothing and don't move under text.
 *
 * The blobs are far larger than the viewport and low-alpha, so the falloff is slow and no
 * gradient edge is ever visible — it should register as "the page isn't quite white" rather than
 * as a pattern. `fixed` so it doesn't slide around under the glass while scrolling.
 */
export function PageBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-white"
      style={{ backgroundImage: PAGE_BACKDROP_IMAGE }}
    />
  );
}
