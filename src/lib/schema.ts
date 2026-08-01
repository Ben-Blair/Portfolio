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

const base = { caption: z.string().optional() };

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
  /** Slowly spin on its own. */
  autoRotate: z.boolean().default(true),
  /** Tilt/orbit the camera as the section scrolls through the viewport. */
  scrollTilt: z.boolean().default(true),
  /** Let the user click-drag to orbit. Disables scrollTilt while dragging. */
  interactive: z.boolean().default(true),
  /** Fine-tuning for a specific scan, since every capture lands differently. */
  scale: z.number().default(1),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  /**
   * How far the camera sits back, as a multiple of the scan's largest dimension.
   * 1.2 frames it snugly; raise it to pull back, lower it to push in.
   */
  cameraDistance: z.number().default(1.2),
});

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
