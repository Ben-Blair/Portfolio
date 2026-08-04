import { z } from "zod";

/**
 * The contract for everything in `content/projects/*.mdx`.
 *
 * Adding a new kind of media = add a variant to `mediaSchema` below, then add the
 * matching case to `src/components/media/MediaBlock.tsx`. Nothing else needs to change.
 */

const imageItem = z.object({
  src: z.string(),
  alt: z.string().default(""),
  caption: z.string().optional(),
});

const base = {
  caption: z.string().optional(),
  /**
   * Show this item as the hero on the projects list and nowhere else. The project page skips
   * it, so a short autoplaying loop can front the list without being replayed under the
   * write-up — put the longer cut after it in `media` and that's what the page opens with.
   */
  heroOnly: z.boolean().default(false),
};

/** A single photo. */
const imageMedia = z.object({
  ...base,
  type: z.literal("image"),
  src: z.string(),
  alt: z.string().default(""),
  /** Render tall/portrait media without cropping. */
  fit: z.enum(["cover", "contain"]).default("cover"),
});

/** A grid of photos with a click-to-zoom lightbox. */
const galleryMedia = z.object({
  ...base,
  type: z.literal("gallery"),
  items: z.array(imageItem).min(1),
  columns: z.number().int().min(2).max(4).default(3),
});

/** A hero-sized photo carousel with next/back buttons. */
const carouselMedia = z.object({
  ...base,
  type: z.literal("carousel"),
  items: z.array(imageItem).min(1),
});

/** A self-hosted video file (mp4/webm) in `public/media/<slug>/`. */
const videoMedia = z.object({
  ...base,
  type: z.literal("video"),
  src: z.string(),
  poster: z.string().optional(),
  loop: z.boolean().default(true),
  /** Muted + autoplay when scrolled into view. Set false to require a click. */
  autoplay: z.boolean().default(true),
  /** Show native controls. Implies autoplay:false feel; sound stays off until unmuted. */
  controls: z.boolean().default(false),
});

/** A YouTube video. Loads nothing from youtube.com until the user clicks play. */
const youtubeMedia = z.object({
  ...base,
  type: z.literal("youtube"),
  id: z.string(),
  title: z.string().default("YouTube video"),
  /** Override the auto-derived thumbnail if YouTube's is letterboxed or ugly. */
  poster: z.string().optional(),
  /** Play muted, autoplaying, and looping — no click-to-play facade. */
  loop: z.boolean().default(false),
  /**
   * The frame's shape, as a CSS `aspect-ratio`. YouTube's player fits the cut inside whatever box
   * the iframe is given, so anything that isn't 16:9 sits in black bars until this matches what
   * was uploaded. Applied as an inline style, not a Tailwind class: the value comes from content,
   * and the JIT compiler can only see class names it can read in the source.
   */
  aspect: z.string().regex(/^\d+\/\d+$/, 'Expected a ratio like "16/9"').default("16/9"),
});

/**
 * An iPhone Live Photo / boomerang: a still that comes alive on hover.
 * Export the Live Photo, then transcode the .MOV — see README.
 */
const livePhotoMedia = z.object({
  ...base,
  type: z.literal("livephoto"),
  poster: z.string(),
  src: z.string(),
  alt: z.string().default(""),
  /** Play forward then backward, like a boomerang, instead of looping from the start. */
  boomerang: z.boolean().default(true),
});

/** A 3D Gaussian splat scan. `.ply`, `.splat`, `.ksplat`, `.spz`, or `.sog`. */
const splatMedia = z.object({
  ...base,
  type: z.literal("splat"),
  src: z.string(),
  /** Shown while the (large) splat file downloads, and as the no-WebGL fallback. */
  poster: z.string().optional(),
  /**
   * Fine-tuning for a specific scan, since every capture lands differently. The defaults here
   * are deliberately neutral — a new scan starts unmoved and unrotated on the orbit centre, and
   * gets dialled in from there with the dev tuner.
   */
  scale: z.number().default(1),
  /**
   * Where the subject sits relative to the orbit centre. The camera orbits the world origin and
   * looks at it, so this slides the scan against that fixed point: tune `y` until the part of
   * the scan worth looking at is centred in frame. `x`/`z` offsets parallax as the camera
   * sweeps, so they should end up near zero unless that swing is the effect you want.
   */
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  /** The scan's own orientation. Static — the camera moves, the scan doesn't. */
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  /**
   * How far the camera sits back, as a multiple of the scan's largest dimension.
   * 1.2 frames it snugly; raise it to pull back, lower it to push in.
   */
  cameraDistance: z.number().default(2.6),
  /**
   * Azimuth at the *centre* of the scroll sweep, in radians. Aim this at the face you want seen
   * head-on: the camera runs ±`SPLAT_CONFIG.YAW_SWEEP` either side of it as the section scrolls
   * through the viewport, so this angle is what's on screen when the section is centred.
   */
  cameraYaw: z.number().default(0),
  /**
   * Camera elevation at the centre of the sweep, in radians — the resting pose, seen whenever
   * the section is sitting still in the middle of the viewport. 0 is dead level; positive looks
   * down at the scan. The sweep climbs `SPLAT_CONFIG.PITCH_SWEEP` above this at either end.
   * Clamped to `SPLAT_CONFIG.PITCH_LIMIT`.
   */
  cameraPitch: z.number().default(0),
});

/**
 * Exported so the dev tuner can derive the defaults it compares against when deciding which
 * values are worth writing into frontmatter. Reading them off the schema means that list can
 * never drift from the schema itself.
 */
export const splatMediaSchema = splatMedia;

export const mediaSchema = z.discriminatedUnion("type", [
  imageMedia,
  galleryMedia,
  carouselMedia,
  videoMedia,
  youtubeMedia,
  livePhotoMedia,
  splatMedia,
]);

export const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const projectFrontmatterSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  /**
   * YYYY-MM-DD. Used for ordering and display.
   *
   * YAML turns a bare `2026-03-01` into a Date and a quoted `"2026-03-01"` into a string,
   * so accept either and normalize — writing the date without quotes is the natural thing
   * to do and shouldn't fail the build.
   */
  date: z
    .union([z.string(), z.date()])
    .transform((value) =>
      typeof value === "string" ? value : value.toISOString().slice(0, 10),
    ),
  /** Surfaced on the homepage. */
  featured: z.boolean().default(false),
  /** Lower sorts first. Ties fall back to newest date. */
  order: z.number().default(100),
  /** Hide from the site without deleting the file. */
  draft: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  /** Card image + social preview + splat fallback. */
  cover: z.string().optional(),
  /** Hex color that tints this project's section. */
  accent: z.string().default("#1f6feb"),
  links: z.array(linkSchema).default([]),
  /** Rendered in order on the project page; media[0] is the hero of its section. */
  media: z.array(mediaSchema).default([]),
  /** One-line status, e.g. "In progress" or "Shipped 2026". */
  status: z.string().optional(),
});

export type Media = z.infer<typeof mediaSchema>;
export type MediaType = Media["type"];
export type ProjectLink = z.infer<typeof linkSchema>;
export type ProjectFrontmatter = z.infer<typeof projectFrontmatterSchema>;

export type Project = ProjectFrontmatter & {
  slug: string;
  /** Raw MDX body, for rendering and for the chat's system prompt. */
  body: string;
};
