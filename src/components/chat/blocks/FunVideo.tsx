"use client";

import { useEffect, useRef, useState } from "react";

import { markFunFrame, resetFunFrame } from "@/components/chat/funFrame";
import { cn } from "@/lib/utils";

/**
 * The Fun panel's video. Self-hosted, autoplaying, muted, looped — and covered by its own first
 * frame whenever it isn't actually painting one.
 *
 * A native `<video poster>` only covers the gap before the element starts playback. Autoplay
 * throws that still away the moment `play()` is called, which is often several hundred milliseconds
 * before a decoded frame reaches the screen — and that gap is a black rectangle. `next/image`
 * made it worse: it fetches an optimized `/_next/image` URL, so the raw `poster.jpg` we warm on
 * hover/click never helped the overlay. The still is the same URL the warmer already fetched,
 * painted as the box's background (so it can show before React hydrates the `<img>`) and as an
 * `<img>` on top until the first video frame is really there.
 *
 * `requestVideoFrameCallback` is that "really there". `playing` fires too early; a stall mid-loop
 * still flips the overlay back on via `waiting`.
 */
export function FunVideo({
  src,
  poster,
  title,
  aspect,
}: {
  src: string;
  poster: string;
  title: string;
  aspect: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    resetFunFrame();
    const painted = () => {
      if (cancelled) return;
      setHasFrame(true);
      markFunFrame();
    };

    if (typeof video.requestVideoFrameCallback === "function") {
      const id = video.requestVideoFrameCallback(() => painted());
      return () => {
        cancelled = true;
        resetFunFrame();
        video.cancelVideoFrameCallback(id);
      };
    }

    const fallback = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) painted();
    };
    video.addEventListener("loadeddata", fallback);
    video.addEventListener("playing", fallback);
    fallback();
    return () => {
      cancelled = true;
      resetFunFrame();
      video.removeEventListener("loadeddata", fallback);
      video.removeEventListener("playing", fallback);
    };
  }, [src]);

  const cover = !hasFrame || stalled;

  return (
    <div
      style={{
        aspectRatio: aspect,
        backgroundImage: `url(${poster})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="relative w-full overflow-hidden rounded-2xl border border-neutral-200"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        title={title}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onWaiting={() => setStalled(true)}
        onPlaying={() => setStalled(false)}
        className="absolute inset-0 size-full object-cover"
      />
      <img
        src={poster}
        alt=""
        aria-hidden
        fetchPriority="high"
        className={cn(
          "pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-200",
          cover ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
