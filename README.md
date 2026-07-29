# Portfolio

Personal site for Benjamin Blair. Next.js 16 (App Router), TypeScript, Tailwind v4.

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional, for the hero chat — copy `.env.example` to `.env.local` and fill in:

```
GOOGLE_GENERATIVE_AI_API_KEY=...    # https://aistudio.google.com/apikey
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Without a key the site works completely; the chat input just shows an "offline, email me
instead" state.

---

## Everything you'll actually want to change

All content lives in `content/` and `public/`. **You should never need to edit a component to
change what the site says.**

| I want to… | Edit |
|---|---|
| Change my name, headline, bio, socials, hero pills | `content/profile.ts` |
| Update my resume | Replace `public/BenjaminBlair_Resume.pdf`, then edit `content/resume.ts` |
| Add a project | Create `content/projects/<slug>.mdx` |
| Remove a project | Delete its `.mdx` file |
| Hide a project without deleting it | Add `draft: true` to its frontmatter |
| Reorder projects | Change `order:` (lower sorts first) |
| Change which projects are on the homepage | Toggle `featured:` |
| Retune the fluid background | `src/lib/fluid/config.ts` |
| Switch the AI model | `src/lib/ai.ts` (one line) |

---

## Adding a project

Create `content/projects/my-project.mdx`:

```mdx
---
title: My Project
tagline: One sentence that makes someone want to read on.
date: 2026-07-01
featured: true          # show on the homepage
order: 1                # lower sorts first
status: In progress     # optional line above the title
accent: "#7c3aed"       # tints this project's section
tags: [Python, OpenCV]
cover: /media/my-project/cover.jpg
links:
  - { label: GitHub, href: "https://github.com/Ben-Blair/..." }
media:
  - type: image
    src: /media/my-project/shot.jpg
    alt: Describe the image
    caption: Optional caption.
---

The write-up goes here. This is MDX — regular markdown, plus the components below.
```

Drop the images/videos in `public/media/my-project/`. That's it — it appears on the homepage,
in the `/projects` scroll, and at `/projects/my-project` automatically.

If you get the frontmatter wrong, the page fails loudly with the filename and the offending
field rather than rendering something blank. The rules live in `src/lib/schema.ts`.

### Media types

`media` is an ordered list; mix as many as you like. `media[0]` is what shows in the
`/projects` scroll section, so lead with your strongest one.

```yaml
# A photo
- { type: image, src: /media/x/a.jpg, alt: "...", fit: cover }   # fit: cover | contain

# A grid of photos with click-to-zoom
- type: gallery
  columns: 3
  items:
    - { src: /media/x/1.jpg, alt: "..." }
    - { src: /media/x/2.jpg, alt: "..." }

# A video file you host yourself
- { type: video, src: /media/x/clip.mp4, poster: /media/x/poster.jpg, loop: true }

# A YouTube video (nothing loads from YouTube until someone clicks play)
- { type: youtube, id: dQw4w9WgXcQ, title: "Launch day" }

# A Live Photo / boomerang — still image that animates on hover
- { type: livephoto, poster: /media/x/pad.jpg, src: /media/x/pad.mp4, boomerang: true }

# A 3D Gaussian splat scan
- { type: splat, src: /splats/rocket.splat, poster: /media/x/cover.jpg, cameraDistance: 1.2 }
```

`content/projects/high-power-rocket.mdx` is a `draft: true` template showing all six types in
one file. Copy from it, or delete it.

### Components you can use inside the MDX body

```mdx
<Note>A callout box for an aside.</Note>

<Media type="youtube" id="dQw4w9WgXcQ" title="Demo" />
```

Add more in `src/components/mdx/MdxComponents.tsx`.

---

## Adding a Gaussian splat

The viewer reads `.splat`, `.ply`, `.ksplat`, `.spz` (v1–v3) and `.sog`.

A raw training `.ply` carries full spherical harmonics — 100 MB+ is normal, which is far too
heavy to serve. Convert it first:

```bash
node scripts/ply-to-splat.mjs ~/scans/rocket.ply public/splats/rocket.splat --max 320000
```

`--max N` keeps only the N most opaque splats. 300–400k lands around 10 MB and still looks
good; drop it lower if the file feels heavy.

Then reference it:

```yaml
- type: splat
  src: /splats/rocket.splat
  poster: /media/rocket/cover.jpg   # shown while the file downloads
  autoRotate: true                  # slow spin
  scrollTilt: true                  # tilts as the section scrolls past
  interactive: true                 # drag to orbit, scroll to zoom
  cameraDistance: 1.2               # multiple of the scan's size; raise to pull back
```

The viewer measures the scan and frames it automatically, so `cameraDistance` is usually the
only thing you'd touch. It only loads when its section approaches the viewport, and falls back
to `poster` if the browser has no WebGL2.

**Note on PlayCanvas exports:** those produce SPZ v4, which this renderer doesn't read.
Convert from the source `.ply` instead.

---

## Adding a Live Photo

Export the Live Photo from Photos (you get a `.HEIC` and a `.MOV`), then:

```bash
ffmpeg -i IMG_1234.MOV -vcodec libx264 -crf 24 -pix_fmt yuv420p -an public/media/x/clip.mp4
sips -s format jpeg IMG_1234.HEIC --out public/media/x/clip.jpg
```

---

## How the pieces fit

```
content/                    Everything you edit
  profile.ts                Name, headline, bio, socials, hero pills
  resume.ts                 Structured resume for the HTML view + the chat
  projects/*.mdx            One file per project
public/
  media/<slug>/             Images and video per project
  splats/                   3D scans
  BenjaminBlair_Resume.pdf  The downloadable resume
scripts/
  ply-to-splat.mjs          PLY -> web-ready splat converter
src/
  lib/schema.ts             Frontmatter contract (Zod)
  lib/content.ts            Reads + validates content/
  lib/ai.ts                 Chat model + system prompt (built from content/)
  lib/fluid/                The cursor-reactive hero background
  components/media/         One component per media type
  app/                      Routes
```

The hero chat's system prompt is generated from `content/` on every request, so when you add a
project the chat knows about it with no extra work.

The background is a WebGL2 Navier–Stokes fluid simulation — your cursor injects colour and
velocity, and vorticity confinement makes the curls. All the tunables are named constants in
`src/lib/fluid/config.ts`; you shouldn't need to touch the shaders.

---

## Deploying

Not deployed yet. When you're ready, Vercel is the path of least resistance: push to GitHub,
import the repo, and set `GOOGLE_GENERATIVE_AI_API_KEY` and `NEXT_PUBLIC_SITE_URL` in the
project's environment variables.

One thing to know first: `public/splats/` holds a ~10 MB binary. That's fine for GitHub, but if
you add several more scans, move them to Git LFS or object storage rather than letting the repo
balloon.
