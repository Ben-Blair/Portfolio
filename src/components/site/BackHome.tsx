import Image from "next/image";
import Link from "next/link";

import { profile } from "@content/profile";

/**
 * The way back to the hero. There's no nav bar anywhere on this site, so every sub-page renders
 * one of these — a small avatar pinned to the top-center edge of the viewport, above everything
 * else, that just links to `/`.
 *
 * No `bg-*` utility on this: Tailwind utilities outrank the `.glass` rule in `globals.css`, so
 * one would replace the glass tint outright and leave this a plain white box.
 */
export function BackHome() {
  return (
    <Link
      href="/"
      aria-label={`Back to ${profile.name}'s home page`}
      className="glass fixed left-1/2 top-0 z-50 flex size-14 -translate-x-1/2 items-center justify-center rounded-b-2xl hover:h-[60px]"
      data-glass
      suppressHydrationWarning
    >
      <span className="relative size-9 overflow-hidden rounded-full">
        <Image
          src={profile.avatar}
          alt={profile.fullName}
          fill
          sizes="36px"
          className="object-contain"
        />
      </span>
    </Link>
  );
}
