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
  INTENSITY: number;
  PASTEL: number;
  MAX_DPR: number;
  HUE_DRIFT_SPEED: number;
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
   * so 0.32 means a trail is still clearly visible ~3s after you draw it and gone by ~10s.
   * Push it up if the hero starts feeling muddy; push it down for longer-lived streaks.
   */
  DENSITY_DISSIPATION: 0.16,

  /** How fast motion dies down. Higher = the fluid settles instead of churning forever. */
  VELOCITY_DISSIPATION: 0.04,

  /** Jacobi iterations for the pressure solve. More = less divergence, more GPU. 20 is the sweet spot. */
  PRESSURE_ITERATIONS: 20,

  /** How much pressure carries between frames. */
  PRESSURE: 0.8,

  /** Vorticity confinement strength — this is what makes the curls. Turn to 0 for a boring smear. */
  CURL: 55,

  /** Size of the blob injected at the cursor, as a fraction of the canvas. */
  SPLAT_RADIUS: 0.19,

  /** How hard a cursor move shoves the fluid. */
  SPLAT_FORCE: 7000,

  /** Multiplier on how bright injected dye is. Lower on light backgrounds. */
  SPLAT_INTENSITY: 0.42,

  /** Overall opacity of the whole canvas. The content has to stay readable on top of it. */
  OPACITY: 0.95,

  /** Contrast of the dye against white. Above ~1.6 it starts to look like paint, not vapor. */
  INTENSITY: 1.15,

  /** How far each color sits from white. 0 = invisible, 1 = fully saturated. */
  PASTEL: 0.68,

  /** Cap on device pixel ratio for the canvas. The dye is soft; nobody can tell it's not 3x. */
  MAX_DPR: 1.5,

  /**
   * Hue range (0-1) that splat colors are sampled from, cycling slowly over time so a long
   * session doesn't stay one color. The reference site drifts through pinks, greens and blues.
   */
  HUE_DRIFT_SPEED: 0.09,
  SATURATION: 0.55,
  VALUE: 1.0,

  /** Idle drift: occasional automatic splats so the hero isn't dead before you touch it. */
  AMBIENT_SPLATS: true,
  /** Seconds between ambient splats. */
  AMBIENT_INTERVAL: 1.6,
  /** Ambient splats are gentler than cursor ones. */
  AMBIENT_SCALE: 0.5,

  /** Splats fired once on load so the hero has color before any interaction. */
  INITIAL_SPLATS: 16,
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
