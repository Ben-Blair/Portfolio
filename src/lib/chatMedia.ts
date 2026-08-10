import "server-only";

import path from "node:path";
import { cache } from "react";

import { getProjects } from "./content";
import { mediaSchema, type Media } from "./schema";

/**
 * The closed set of media the chat is allowed to show.
 *
 * The model can't be handed file paths — it would invent them. Instead it gets a list of IDs in
 * its system prompt and cites one by writing `[media:high-power-rocket/stats]`; the renderer looks
 * that ID up here and draws the matching `MediaBlock`. Anything not in this list resolves to
 * nothing, so a hallucinated ID costs a missing picture rather than a broken image or, worse, a
 * raw token sitting in the middle of an answer.
 *
 * Both sides of that contract are built from this one function — the prompt in `ai.ts` and the map
 * handed to the browser in `chat/page.tsx` — which is what stops the two from drifting apart.
 */

export type ChatMediaEntry = {
  /** What the model writes inside `[media:…]`. */
  id: string;
  slug: string;
  /** How the entry is described to the model. Prompt-side only — see `MediaCatalog`. */
  label: string;
  media: Media;
};

/**
 * The part of the ID after the slug.
 *
 * Derived from the asset rather than its position in the list. A positional `high-power-rocket/1`
 * tells the model nothing about what it's citing, and every number shifts the moment media is
 * reordered or an excluded item lands above it — including silently, since `heroOnly` and splats
 * are filtered out below. A name taken from the file survives all of that and reads like something
 * worth pointing at.
 */
function mediaKey(media: Media): string {
  switch (media.type) {
    case "image":
    case "video":
    case "livephoto":
    case "splat":
      return slugifyKey(path.basename(media.src, path.extname(media.src)));
    case "youtube":
      return "youtube";
    // The assets are one level down in `items`, and the first one's filename would name the set
    // after whichever photo happens to lead it.
    case "carousel":
    case "gallery":
      return "photos";
  }
}

function slugifyKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * What the model reads when deciding whether this is the right thing to show. Falls back to the
 * project's tagline, because an entry with no description is one the model will never pick.
 */
function mediaLabel(media: Media, fallback: string): string {
  const written = [
    media.caption,
    media.type === "image" || media.type === "livephoto" ? media.alt : undefined,
    media.type === "carousel" || media.type === "gallery" ? media.items[0]?.alt : undefined,
    // The schema's default, which describes nothing.
    media.type === "youtube" && media.title !== "YouTube video" ? media.title : undefined,
  ];

  return written.find((value) => value?.trim())?.trim() ?? fallback;
}

/**
 * Pulls `<Media />` tags out of an MDX body.
 *
 * Some of the best assets are written inline rather than in the frontmatter, because they belong at
 * a particular point in the write-up — the rocket's OpenRocket summary in
 * `content/projects/high-power-rocket.mdx` is the clearest case, and it's exactly the thing an
 * answer about that project should be able to show. A frontmatter-only catalog can't see it.
 *
 * Validated through `mediaSchema`, the same contract `MdxComponents` applies to the identical tag,
 * so a body and a page can never disagree about what an item is. Unlike that component, a tag that
 * fails to parse is skipped in silence: this list is an offer to the model, not a render, and the
 * project page already surfaces the error where an author will see it.
 */
function inlineMedia(body: string): Media[] {
  const found: Media[] = [];

  for (const [, attributes] of body.matchAll(/<Media\b([\s\S]*?)\/>/g)) {
    const parsed = mediaSchema.safeParse(parseAttributes(attributes));
    if (parsed.success) found.push(parsed.data);
  }

  return found;
}

/**
 * JSX attributes, as far as this needs to understand them: `name="string"`, `name={literal}`, and
 * bare `name` shorthand. Ordered alternation, so a bare name only matches where no `=` follows.
 *
 * Every tag in `content/` today is strings alone. The braced form is here so that adding a
 * `loop={false}` later changes how an item renders rather than dropping it out of the catalog.
 */
function parseAttributes(source: string): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  const pattern = /([A-Za-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})|([A-Za-z][\w-]*)/g;

  for (const match of source.matchAll(pattern)) {
    const [, named, doubleQuoted, singleQuoted, braced, bare] = match;

    if (bare) {
      // `<Media boomerang />` is JSX shorthand for `boomerang={true}`.
      attributes[bare] = true;
      continue;
    }

    const value = doubleQuoted ?? singleQuoted ?? (braced !== undefined ? literal(braced) : undefined);
    // An expression this can't read is left off entirely, so the schema's default applies — or,
    // if the field was required, `safeParse` fails and the tag is skipped.
    if (value !== undefined) attributes[named] = value;
  }

  return attributes;
}

function literal(source: string): string | number | boolean | undefined {
  const value = source.trim();

  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);

  const quoted = value.match(/^(["'])(.*)\1$/);
  return quoted?.[2];
}

/**
 * Every media item the chat may cite, in project order.
 *
 * Splats are excluded: `SplatBlock` pulls in three.js and Spark, and its camera is driven by the
 * page scroll, neither of which belongs in an answer that's still being typed. Every project with
 * a splat has a flat image alongside it. `heroOnly` items are excluded for the reason the project
 * page skips them too (`schema.ts`) — they front the projects list, and nothing else.
 */
export const getChatMedia = cache((): ChatMediaEntry[] => {
  const entries: ChatMediaEntry[] = [];

  for (const project of getProjects()) {
    const used = new Map<string, number>();

    for (const media of [...project.media, ...inlineMedia(project.body)]) {
      if (media.type === "splat" || media.heroOnly) continue;

      const key = mediaKey(media);
      const count = (used.get(key) ?? 0) + 1;
      used.set(key, count);

      const id = `${project.slug}/${count === 1 ? key : `${key}-${count}`}`;

      // The token is matched with `[^\]\s]+`, and the typewriter's typed/faded seam is only safe
      // because it can never land inside one (`Answer.tsx`). Both rest on IDs having no spaces in
      // them, and the slug half comes straight off a filename — so check rather than assume.
      if (/\s/.test(id)) {
        throw new Error(
          `Chat media id "${id}" contains whitespace, which the [media:…] token can't carry. ` +
            `Rename content/projects/${project.slug}.mdx to remove the space.`,
        );
      }

      entries.push({
        id,
        slug: project.slug,
        label: mediaLabel(media, project.tagline),
        media,
      });
    }
  }

  return entries;
});

/** The catalog as the browser needs it: ID in, media out. See `MediaCatalog`. */
export const getChatMediaMap = cache((): Record<string, Media> =>
  Object.fromEntries(getChatMedia().map((entry) => [entry.id, entry.media])),
);
