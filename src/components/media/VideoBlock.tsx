"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { YOUTUBE_EMBED_ORIGIN } from "@/components/chat/warm";
import type { Media } from "@/lib/schema";

type VideoProps = Extract<Media, { type: "video" }>;
type YouTubeProps = Extract<Media, { type: "youtube" }>;
type LivePhotoProps = Extract<Media, { type: "livephoto" }>;

/**
 * A self-hosted video. Plays only while it's on screen — a projects page with ten sections
 * would otherwise have ten videos decoding at once.
 */
export function VideoBlock({ src, poster, loop, autoplay, controls, caption }: VideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !autoplay) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // A rejected play() is normal (autoplay policy, or the tab isn't focused).
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [autoplay]);

  return (
    <figure className="not-prose">
      {/* The frame is the wrapper's, not the video's — the same arrangement `YouTubeBlock` and
          `LivePhotoBlock` use below, and for a reason that shows up as a black fringe when it
          isn't. `aspect-video` applies 16/9 to the border box, so a 1px border leaves a content
          box of 1.783:1 for a 1.778:1 file: `object-fit: contain` then centres the picture with a
          sub-pixel bar of `bg-neutral-900` down each side, widening into a dark crescent wherever
          the corner radius cuts in. Cropping to the box instead of fitting inside it means the
          background has nothing left to show through, and clipping on an ordinary element rather
          than on the video itself keeps the corners off the compositor's rounding. */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900">
        <video
          ref={ref}
          src={src}
          poster={poster}
          loop={loop}
          controls={controls}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      {caption && <figcaption className="mt-2 text-[13px] text-neutral-500">{caption}</figcaption>}
    </figure>
  );
}

/**
 * A YouTube video, in one of two modes.
 *
 * By default it's a facade: nothing is requested from youtube.com until the visitor actually
 * clicks play, which keeps the page fast and their trackers off every view.
 *
 * `loop` trades that away deliberately — the video starts on its own and repeats, so the frame
 * is the picture rather than a thumbnail of it. It has to start muted, because no browser will
 * autoplay audio unprompted; the player keeps its own controls, which is where sound gets turned
 * back on.
 */
export function YouTubeBlock({ id, title, poster, loop, aspect, caption }: YouTubeProps) {
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const thumbnail = poster ?? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

  /**
   * Points the autoplaying embed at its URL, after mount and by hand rather than as a rendered
   * attribute, because `origin` has to be part of it and the only place that value exists is
   * `window`. It isn't optional: a player asked to start on its own without being told what page
   * it's on answers with "Error 153, video player configuration error" and sits at 0:00 forever.
   * Rendering it would mean guessing the host on the server and hydrating over the guess, so it's
   * assigned here — a DOM node being told about the world, which is what an effect is for.
   */
  useEffect(() => {
    const el = frame.current;
    if (!loop || !el) return;

    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      loop: "1",
      // A single-video loop has to name itself as the playlist; there's no other way to say it.
      playlist: id,
      playsinline: "1",
      // Keeps the end-of-video suggestions to this channel instead of the whole of YouTube.
      rel: "0",
      enablejsapi: "1",
      origin: window.location.origin,
    });
    el.src = `${YOUTUBE_EMBED_ORIGIN}/embed/${id}?${params}`;
  }, [loop, id]);

  return (
    <figure className="not-prose">
      {/* The ratio is a style rather than a class because it comes from content, and Tailwind's
          compiler can only see class names written in the source. YouTube fits the video inside
          whatever box the iframe is given, so a cut that isn't 16:9 sits in bars until this
          matches what was uploaded. */}
      <div
        style={{ aspectRatio: aspect }}
        className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900"
      >
        {loop ? (
          // No `src` here on purpose — the effect above assigns it once there's a `window` to
          // read the origin from.
          <iframe
            ref={frame}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : playing ? (
          <iframe
            src={`${YOUTUBE_EMBED_ORIGIN}/embed/${id}?autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 size-full"
            aria-label={`Play: ${title}`}
          >
            {/* Not next/image: YouTube thumbnails are remote and would need a domain allowlist. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/25">
              <span className="flex size-16 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-105">
                <Play className="ml-1 size-6 fill-neutral-900 text-neutral-900" />
              </span>
            </span>
          </button>
        )}
      </div>
      {caption && <figcaption className="mt-2 text-[13px] text-neutral-500">{caption}</figcaption>}
    </figure>
  );
}

/**
 * An iPhone Live Photo / boomerang: a still that comes alive on hover (or tap on touch).
 * With `boomerang`, playback reverses at the end instead of cutting back to frame one.
 */
export function LivePhotoBlock({ poster, src, alt, boomerang, caption }: LivePhotoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const reversing = useRef(false);
  const raf = useRef(0);

  function start() {
    const video = ref.current;
    if (!video) return;
    setActive(true);
    reversing.current = false;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }

  function stop() {
    const video = ref.current;
    setActive(false);
    reversing.current = false;
    cancelAnimationFrame(raf.current);
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }

  // Reverse playback has no native equivalent, so step currentTime backwards per frame.
  useEffect(() => {
    const video = ref.current;
    if (!video || !boomerang) return;

    const onEnded = () => {
      reversing.current = true;
      let last = performance.now();
      const step = (now: number) => {
        const dt = (now - last) / 1000;
        last = now;
        if (!reversing.current) return;
        video.currentTime = Math.max(0, video.currentTime - dt);
        if (video.currentTime <= 0.02) {
          reversing.current = false;
          if (active) void video.play().catch(() => {});
          return;
        }
        raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    };

    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("ended", onEnded);
      cancelAnimationFrame(raf.current);
    };
  }, [boomerang, active]);

  return (
    <figure className="not-prose">
      <div
        className="group relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100"
        onPointerEnter={start}
        onPointerLeave={stop}
        onClick={() => (active ? stop() : start())}
      >
        <Image
          src={poster}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 384px"
          className={`object-cover transition-opacity duration-200 ${active ? "opacity-0" : "opacity-100"}`}
        />
        <video
          ref={ref}
          src={src}
          muted
          playsInline
          preload="metadata"
          className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${active ? "opacity-100" : "opacity-0"}`}
        />

        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-white" />
          LIVE
        </span>
      </div>
      {caption && <figcaption className="mt-2 text-[13px] text-neutral-500">{caption}</figcaption>}
    </figure>
  );
}
