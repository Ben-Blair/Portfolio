/**
 * The wash behind every page that isn't the hero.
 *
 * Shared so the turn overlay can cover the hero with the same field `/projects` sits on, without
 * importing `PageBackdrop` (a server component) into a client module.
 */
export const PAGE_BACKDROP_IMAGE = [
  "radial-gradient(60rem 45rem at 12% -8%, rgb(255 168 122 / 0.22), transparent 62%)",
  "radial-gradient(55rem 40rem at 92% 6%, rgb(140 180 255 / 0.24), transparent 60%)",
  "radial-gradient(50rem 42rem at 82% 88%, rgb(186 148 255 / 0.22), transparent 62%)",
  "radial-gradient(52rem 40rem at 6% 82%, rgb(120 220 188 / 0.20), transparent 60%)",
  "radial-gradient(70rem 50rem at 50% 45%, rgb(255 205 155 / 0.13), transparent 70%)",
].join(", ");
