/**
 * Every knob for the hero background lives here.
 *
 * This is a Navier-Stokes fluid simulation: your cursor injects velocity and color ("dye")
 * into a field, the field advects itself, and vorticity confinement puts the curl back in
 * that the numerical solver otherwise smears away.
 *
 * You should never need to edit shader source to retune the look — change numbers here.
 */
export interface FluidConfig {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE_ITERATIONS: number;
  PRESSURE: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  SPLAT_INTENSITY: number;
  OPACITY: number;
  SHADING: number;
  MAX_DPR: number;
  COLOR_UPDATE_SPEED: number;
  SATURATION: number;
  VALUE: number;
  AMBIENT_SPLATS: boolean;
  AMBIENT_INTERVAL: number;
  AMBIENT_SCALE: number;
  INITIAL_SPLATS: number;
}

export const FLUID_CONFIG: FluidConfig = {
  /**
   * Resolution of the *velocity* field (short edge, in texels). The sim runs far below screen
   * resolution — 128 is plenty, and the cost of the pressure solve scales with the square of it.
   */
  SIM_RESOLUTION: 128,

  /** Resolution of the *color* field. This is what you actually see, so it's higher. */
  DYE_RESOLUTION: 1440,

  /**
   * How fast color fades. Roughly, dye decays to 1/e of its brightness every 1/this seconds,
   * so 0.44 leaves a trail readable for a couple of seconds before it clears.
   *
   * This is the main dial for how *full* the hero looks. Push it up and the canvas empties out
   * between strokes; drop it much below this and dye stops clearing between splats, piles up,
   * and the viewport saturates into flat slabs instead of discrete ribbons.
   */
  DENSITY_DISSIPATION: 0.44,

  /**
   * How fast motion dies down. Higher = the fluid settles instead of churning forever.
   * Above 1 a splat expands once and then largely stops, which is what keeps ribbons thin:
   * dye never gets smeared across the whole canvas.
   */
  VELOCITY_DISSIPATION: 3.4,

  /**
   * Jacobi iterations for the pressure solve. More = less divergence, more GPU. Upstream uses
   * 20; 5 is deliberately loose here — the residual divergence reads as extra drift, and this
   * is a background, not a physics demo.
   */
  PRESSURE_ITERATIONS: 5,

  /** How much pressure carries between frames. */
  PRESSURE: 0.44,

  /** Vorticity confinement strength — this is what puts the curls back in. */
  CURL: 3,

  /**
   * Size of the blob injected at the cursor, as a fraction of the canvas.
   *
   * Lower than looks right in isolation, because the glass surfaces are the other consumer of
   * this. Refraction can only reveal structure that exists — displacing a wide, soft blob just
   * gives back the same wide, soft blob, and the pills read as frosted plastic. Tighter splats
   * lay down ribbons with actual edges, which is what the lensing and the colour fringing have
   * to work with.
   */
  SPLAT_RADIUS: 0.11,

  /** How hard a cursor move shoves the fluid. */
  SPLAT_FORCE: 6200,

  /**
   * Multiplier on how bright injected dye is. Upstream scales its generated color by 0.15
   * here; this injects at full strength instead and pulls the whole canvas back with OPACITY
   * below. Same end result, but dense and faint dye keep their relative contrast rather than
   * both being crushed toward zero before the display pass sees them.
   */
  SPLAT_INTENSITY: 1,

  /**
   * Overall opacity of the whole canvas, and the counterweight to SPLAT_INTENSITY above.
   * Low on purpose: the headline sits directly on top of this and has to stay readable.
   */
  OPACITY: 0.2,

  /**
   * Strength of the fake directional light on the dye gradient, which gives ribbons a lit
   * edge instead of reading as flat tint. 0 disables the shading branch entirely.
   */
  SHADING: 1.0,

  /** Cap on device pixel ratio for the canvas. The dye is soft; nobody can tell it's not 3x. */
  MAX_DPR: 1.5,

  /**
   * How many times per second splat color re-rolls to a new random hue. High on purpose: at
   * ~12 a single cursor sweep lays down several distinct hues that meet and blend, which is
   * the whole rainbow look. Turn it down and each stroke becomes one flat color.
   */
  COLOR_UPDATE_SPEED: 11.5,
  SATURATION: 1.0,
  VALUE: 1.0,

  /** Idle drift: occasional automatic splats so the hero isn't dead before you touch it. */
  AMBIENT_SPLATS: false,
  /** Seconds between ambient splats. */
  AMBIENT_INTERVAL: 4,
  /** Scale applied to ambient splats relative to cursor ones. */
  AMBIENT_SCALE: 1.05,

  /** Splats fired once on load so the hero has color before any interaction. */
  INITIAL_SPLATS: 0,
};

/** Halved sim/dye resolution and no ambient splats on small or low-power devices. */
export function mobileConfig(config: FluidConfig): FluidConfig {
  return {
    ...config,
    SIM_RESOLUTION: 96,
    DYE_RESOLUTION: 512,
    PRESSURE_ITERATIONS: 14,
    MAX_DPR: 1,
  };
}
