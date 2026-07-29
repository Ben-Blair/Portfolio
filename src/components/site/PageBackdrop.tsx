/**
 * The wash behind every page that isn't the hero.
 *
 * This exists for the glass, not for its own sake. `.glass` surfaces refract, blur and saturate
 * whatever sits behind them, and over a flat `bg-white` all three of those are no-ops — bending
 * white gives you white, so the pills on `/about`, `/resume` and the rest collapsed into plain
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
      style={{
        backgroundImage: [
          "radial-gradient(60rem 45rem at 12% -8%, rgb(255 168 122 / 0.22), transparent 62%)",
          "radial-gradient(55rem 40rem at 92% 6%, rgb(140 180 255 / 0.24), transparent 60%)",
          "radial-gradient(50rem 42rem at 82% 88%, rgb(186 148 255 / 0.22), transparent 62%)",
          "radial-gradient(52rem 40rem at 6% 82%, rgb(120 220 188 / 0.20), transparent 60%)",
          "radial-gradient(70rem 50rem at 50% 45%, rgb(255 205 155 / 0.13), transparent 70%)",
        ].join(", "),
      }}
    />
  );
}
