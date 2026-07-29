/**
 * Builds the displacement maps that give the glass surfaces their refraction.
 *
 * `feDisplacementMap` reads two channels of an image and uses them to offset where each pixel
 * samples from: red drives the x offset, green drives the y offset, and 128 means "don't move".
 * So to make a button bend the background at its rim — the way a thick piece of glass does — we
 * need an image that is neutral grey through the middle and ramps toward the button's inside
 * edge as it approaches the border.
 *
 * We get that from the signed distance to a rounded rectangle: the distance tells us how far
 * inside the edge we are (fading the effect out), and the gradient of that distance tells us
 * which way "inward" points (steering it).
 */

/** Corner radii in CSS px, clockwise from the top left — matches `border-*-radius`. */
export type Corners = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

export type DisplacementMapOptions = {
  /** Element size in CSS px. */
  width: number;
  height: number;
  corners: Corners;
  /** How far in from the edge the refraction fades out, in CSS px. */
  bevel: number;
  /** Supersampling factor, so the ramp doesn't band on retina displays. */
  pixelRatio: number;
};

/**
 * Every hero pill is the same size, so without this we would rasterise the same map five times
 * on load and again on every resize.
 */
const cache = new Map<string, string>();

function cacheKey({ width, height, corners, bevel, pixelRatio }: DisplacementMapOptions) {
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  return `${width}x${height}:${topLeft},${topRight},${bottomRight},${bottomLeft}:${bevel}:${pixelRatio}`;
}

/**
 * Signed distance from `(x, y)` to the edge of a rounded rectangle spanning `0,0 → w,h`.
 * Negative inside, positive outside, in the same units as the inputs.
 */
function roundedRectDistance(
  x: number,
  y: number,
  w: number,
  h: number,
  corners: Corners,
): number {
  // Work from the centre so the shape is symmetric and we can fold it into one quadrant.
  const px = x - w / 2;
  const py = y - h / 2;

  const radius =
    px >= 0
      ? py >= 0
        ? corners.bottomRight
        : corners.topRight
      : py >= 0
        ? corners.bottomLeft
        : corners.topLeft;

  // Distance to the rounded corner arc: offset into the corner circle's centre, then subtract
  // its radius. `qx`/`qy` are clamped at 0 so straight edges fall out of the same expression.
  const qx = Math.abs(px) - w / 2 + radius;
  const qy = Math.abs(py) - h / 2 + radius;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);

  return outside + inside - radius;
}

/**
 * Renders the map for one element and returns it as a `data:` URL ready for `<feImage href>`.
 *
 * Returns `""` during SSR — the caller only ever uses this from an effect, but the guard keeps
 * the module importable from a server component.
 */
export function buildDisplacementMap(options: DisplacementMapOptions): string {
  if (typeof document === "undefined") return "";

  const { width, height, corners, bevel, pixelRatio } = options;
  if (width <= 0 || height <= 0) return "";

  const key = cacheKey(options);
  const cached = cache.get(key);
  if (cached) return cached;

  const w = Math.max(1, Math.round(width * pixelRatio));
  const h = Math.max(1, Math.round(height * pixelRatio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const image = ctx.createImageData(w, h);
  const data = image.data;

  const scaled: Corners = {
    topLeft: corners.topLeft * pixelRatio,
    topRight: corners.topRight * pixelRatio,
    bottomRight: corners.bottomRight * pixelRatio,
    bottomLeft: corners.bottomLeft * pixelRatio,
  };
  const falloff = Math.max(1, bevel * pixelRatio);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      // Sample at pixel centres so the shape isn't biased half a pixel up and left.
      const cx = x + 0.5;
      const cy = y + 0.5;
      const d = roundedRectDistance(cx, cy, w, h, scaled);

      // Outside the shape, and anywhere deeper than the bevel, stays neutral.
      if (d >= 0 || d <= -falloff) {
        data[i] = 128;
        data[i + 1] = 128;
        data[i + 2] = 128;
        data[i + 3] = 255;
        continue;
      }

      // The gradient of a distance field is the outward unit normal. Taking it numerically
      // costs four extra distance evaluations but handles the corner arcs for free.
      const gx =
        roundedRectDistance(cx + 1, cy, w, h, scaled) -
        roundedRectDistance(cx - 1, cy, w, h, scaled);
      const gy =
        roundedRectDistance(cx, cy + 1, w, h, scaled) -
        roundedRectDistance(cx, cy - 1, w, h, scaled);
      const length = Math.hypot(gx, gy) || 1;

      // Smoothstep from the edge inward, so the refraction eases off instead of banding.
      const t = 1 + d / falloff; // 1 at the edge, 0 at `bevel` px in
      const strength = t * t * (3 - 2 * t);

      // Negated: we want to pull the backdrop toward the button's interior, which is what makes
      // the edge read as a lens rather than a smear.
      const nx = -(gx / length) * strength;
      const ny = -(gy / length) * strength;

      data[i] = 128 + nx * 127;
      data[i + 1] = 128 + ny * 127;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}
