/**
 * Every knob for how the Gaussian splat viewer *feels* lives here.
 *
 * The split against `splatMedia` in `src/lib/schema.ts` is deliberate: anything that varies per
 * scan (scale, position, camera angle) is content and belongs in the MDX frontmatter. Anything
 * that should feel identical across every scan on the site — the shape of the scroll move, its
 * easing — belongs here.
 *
 * `SplatBlock` reads `SPLAT_CONFIG.X` inside its render loop rather than destructuring at setup,
 * so the dev tuner can mutate this object in place and see the result on the next frame.
 */
export interface SplatConfig {
  YAW_SWEEP: number;
  PITCH_SWEEP: number;
  PITCH_CYCLES: number;
  DOLLY: number;
  SCROLL_START: number;
  SCROLL_END: number;
  SCROLL_EASE_TAU: number;
  PITCH_LIMIT: number;
  FOV: number;
  NEAR_RATIO: number;
  FAR_RATIO: number;
  SAMPLE_STRIDE: number;
  EXTENT_PERCENTILE: number;
  EXTENT_MULTIPLIER: number;
  FALLBACK_EXTENT: number;
  MAX_DPR: number;
  CLEAR_COLOR: number;
}

export const SPLAT_CONFIG: SplatConfig = {
  /**
   * Half-width of the camera's azimuth sweep, in radians. The camera runs from
   * `cameraYaw - this` to `cameraYaw + this` across the section's travel through the viewport,
   * so 0.8 (~46° either side) shows the aimed face from both sides without ever swinging round
   * to the back.
   */
  YAW_SWEEP: 0.8,

  /**
   * How far *above* `cameraPitch` the camera climbs at the two ends of the sweep, in radians.
   * Combined with the yaw sweep above this is what makes the path a helix rather than a flat
   * arc. Negative dips below the centre elevation at the ends instead.
   *
   * Kept modest: past about 0.4 the camera is high enough to be looking at the top of a
   * subject's head rather than its face, which is the thing the sweep exists to show off.
   */
  PITCH_SWEEP: 0.34,

  /**
   * Full cosine cycles of elevation across the sweep. 1 = high, midway, level, midway, high:
   * the camera settles level as it passes the aimed face and climbs back out either side.
   */
  PITCH_CYCLES: 1,

  /**
   * Fraction of the framed distance the camera pushes in at the midpoint of the sweep. Small on
   * purpose — enough to give the pass through the front a little weight, not enough to read as
   * a zoom.
   */
  DOLLY: 0.08,

  /**
   * The window of the section's viewport travel the move actually plays out over, as fractions
   * of the full enter-to-exit range. Outside it the camera holds at the start or end pose.
   *
   * 0→1 so the scroll keeps driving the sweep for as long as any part of the block is on
   * screen — the camera only stops responding once the block has fully entered or fully left.
   */
  SCROLL_START: 0,
  SCROLL_END: 1,

  /**
   * Time constant for how the camera follows the scroll, in seconds: it closes ~63% of the gap
   * to the scroll-derived pose every this-many seconds.
   *
   * Expressed as a time constant rather than a per-frame fraction on purpose. The obvious
   * `progress += (target - progress) * 0.1` is frame-rate dependent — it eases twice as fast on
   * a 120Hz display as on a 60Hz one — so the easing is driven off the frame delta instead.
   *
   * Enough lag to absorb trackpad momentum and coarse wheel steps, not enough to feel detached
   * from the scroll. 0 disables the glide and locks the camera to the scroll exactly.
   */
  SCROLL_EASE_TAU: 0.12,

  /**
   * Clamp on the camera's elevation, in radians. Just under π/2, because the spherical camera
   * placement degenerates at the poles — at exactly π/2 the up-vector and the view direction are
   * parallel and `lookAt` produces a roll.
   */
  PITCH_LIMIT: 1.2,

  /** Camera vertical field of view, degrees. */
  FOV: 50,

  /** Near plane = framed distance / this. */
  NEAR_RATIO: 1000,
  /** Far plane = framed distance * this. */
  FAR_RATIO: 40,

  /**
   * Measure every Nth splat when sizing the scan. Sampling is plenty to find a centroid and a
   * radius, and keeps the two measurement passes well under a frame even for a million splats.
   */
  SAMPLE_STRIDE: 8,

  /**
   * Percentile of radial distance from the centroid used as the subject's radius.
   *
   * Framing off raw min/max is unreliable: training leaves a scatter of stray Gaussians far
   * outside the subject, and one of those blows the bounds up and parks the camera in the next
   * postcode. Standard deviation has the opposite failure — a room scan has most of its splats
   * bunched in the middle, so it frames the camera inside the walls. The 95th percentile
   * ignores the strays while still containing the actual subject.
   */
  EXTENT_PERCENTILE: 0.95,

  /** The percentile above is a radius; this converts it to the extent the camera frames against. */
  EXTENT_MULTIPLIER: 2,

  /** Extent used when a scan is degenerate (one splat, or every splat coincident). */
  FALLBACK_EXTENT: 4,

  /** Cap on device pixel ratio. Splats are soft; the extra pixels cost more than they show. */
  MAX_DPR: 1.75,

  /** Canvas background. Matches the black frame the viewer sits in. */
  CLEAR_COLOR: 0x000000,
};

/**
 * Pristine copy captured at module load, so the dev tuner's reset has something to restore to —
 * `SPLAT_CONFIG` itself gets mutated in place.
 */
export const SPLAT_DEFAULTS: SplatConfig = { ...SPLAT_CONFIG };
