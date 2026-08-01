"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Media } from "@/lib/schema";

type ImageProps = Extract<Media, { type: "image" }>;
type GalleryProps = Extract<Media, { type: "gallery" }>;
type CarouselProps = Extract<Media, { type: "carousel" }>;

export function ImageBlock({ src, alt, fit, caption }: ImageProps) {
  return (
    <figure className="not-prose">
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50",
          fit === "contain" ? "aspect-[4/3]" : "aspect-[16/10]",
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className={fit === "contain" ? "object-contain p-4" : "object-cover"}
        />
      </div>
      {caption && <figcaption className="mt-2 text-[13px] text-neutral-500">{caption}</figcaption>}
    </figure>
  );
}

export function CarouselBlock({ items, caption }: CarouselProps) {
  const [index, setIndex] = useState(0);
  const active = items[index];

  const goPrev = () => setIndex((current) => (current - 1 + items.length) % items.length);
  const goNext = () => setIndex((current) => (current + 1) % items.length);

  return (
    <figure className="not-prose">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
        <Image
          src={active.src}
          alt={active.alt}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />
        {items.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous photo"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next photo"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      {(active.caption ?? caption) && (
        <figcaption className="mt-2 text-[13px] text-neutral-500">
          {active.caption ?? caption}
        </figcaption>
      )}
    </figure>
  );
}

export function GalleryBlock({ items, columns, caption }: GalleryProps) {
  const [open, setOpen] = useState<number | null>(null);
  const active = open === null ? null : items[open];

  return (
    <figure className="not-prose">
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setOpen(index)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
            aria-label={`Open image: ${item.alt || `image ${index + 1}`}`}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 768px) 33vw, 240px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          </button>
        ))}
      </div>

      {caption && <figcaption className="mt-2 text-[13px] text-neutral-500">{caption}</figcaption>}

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{active?.alt || "Image"}</DialogTitle>
          {active && (
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-neutral-900">
              <Image
                src={active.src}
                alt={active.alt}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          )}
          {active?.caption && (
            <p className="mt-2 text-center text-[13px] text-white/80">{active.caption}</p>
          )}
        </DialogContent>
      </Dialog>
    </figure>
  );
}
