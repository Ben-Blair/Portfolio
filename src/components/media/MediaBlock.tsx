"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { GalleryBlock, ImageBlock } from "@/components/media/ImageBlock";
import { LivePhotoBlock, VideoBlock, YouTubeBlock } from "@/components/media/VideoBlock";
import type { Media } from "@/lib/schema";

/**
 * Splats pull in three.js, Spark, and a file that's often tens of megabytes. Keep all of
 * that out of the initial bundle and off the network until the block is actually near the
 * viewport.
 */
const SplatBlock = dynamic(
  () => import("@/components/media/SplatBlock").then((m) => m.SplatBlock),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[4/3] w-full animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100" />
    ),
  },
);

/** Renders children only once they've come within `rootMargin` of the viewport. */
function WhenNear({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {near ? (
        children
      ) : (
        <div className="aspect-[4/3] w-full rounded-2xl border border-neutral-200 bg-neutral-50" />
      )}
    </div>
  );
}

/**
 * Dispatches one frontmatter media entry to its component.
 *
 * To add a media type: add a variant to `mediaSchema` in `src/lib/schema.ts`, then add a
 * case here. TypeScript will fail the build until both sides agree.
 */
export function MediaBlock({ media }: { media: Media }) {
  switch (media.type) {
    case "image":
      return <ImageBlock {...media} />;
    case "gallery":
      return <GalleryBlock {...media} />;
    case "video":
      return <VideoBlock {...media} />;
    case "youtube":
      return <YouTubeBlock {...media} />;
    case "livephoto":
      return <LivePhotoBlock {...media} />;
    case "splat":
      return (
        <WhenNear>
          <SplatBlock {...media} />
        </WhenNear>
      );
  }
}

export function MediaList({ media }: { media: Media[] }) {
  if (media.length === 0) return null;
  return (
    <div className="space-y-8">
      {media.map((item, index) => (
        <MediaBlock key={`${item.type}-${index}`} media={item} />
      ))}
    </div>
  );
}
