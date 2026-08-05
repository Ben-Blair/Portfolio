"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * The Fun panel's video. Self-hosted, autoplaying, muted, looped — and covered by its own poster
 * whenever the video isn't actually playing, not just before the first frame.
 *
 * A native `<video poster>` only covers the gap before playback starts; a stall mid-loop (a slow
 * connection re-buffering) falls back to whatever frame was last decoded, which can freeze on
 * something half-rendered. `waiting`/`playing` track that state directly and swap in the same
 * still every time, so a stall reads as "paused on frame one" rather than a glitch.
 *
 * The poster is a lossless still pulled from the encode's own first frame, not a separate export
 * from the source cut — that's what makes the swap invisible: the pixels match exactly.
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
  const [buffering, setBuffering] = useState(true);

  return (
    <div
      style={{ aspectRatio: aspect }}
      className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900"
    >
      <video
        src={src}
        poster={poster}
        title={title}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        className="absolute inset-0 size-full object-cover"
      />
      <Image
        src={poster}
        alt=""
        aria-hidden
        fill
        sizes="(max-width: 768px) 100vw, 640px"
        className={`pointer-events-none absolute inset-0 object-cover transition-opacity duration-200 ${
          buffering ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
