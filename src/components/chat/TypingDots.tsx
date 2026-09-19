import { cn } from "@/lib/utils";

/**
 * iOS's spinner: the received bubble that says the other person is writing.
 *
 * `leaving` is the beat where it stops saying that. The bounce is paused rather than removed, so
 * the dots hold wherever they happened to be instead of snapping level, and the bubble drifts down
 * as it fades — away from the question, which is going up.
 *
 * Its own module rather than living in `Answer` with the rest of the turn, which is where it was.
 * `/projects` now opens its turn inside a `loading.tsx` shell — see `ProjectsTurnFrame` — and that
 * shell's whole value is being small enough to be prefetched and painted in the same tick as the
 * click. Reaching into `Answer` for these three dots would have dragged `MediaBlock`, and the
 * carousel, video and 3D viewer behind it, into the one chunk on the site that has to be tiny.
 */
export function TypingDots({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      className={cn(
        "flex w-fit items-center gap-1.5 rounded-3xl rounded-bl-lg bg-neutral-100 px-4 py-3.5",
        // `translate`, not `transform`: Tailwind's `translate-y-*` sets the standalone property,
        // and a transition that only names `transform` lets the dots snap down instead of drift.
        "transition-[opacity,translate] duration-[360ms] ease-out motion-reduce:transition-none",
        leaving && "translate-y-4 opacity-0",
      )}
    >
      {[0, 160, 320].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
          className={cn(
            "size-2 animate-bounce rounded-full bg-neutral-400 motion-reduce:animate-none",
            leaving && "[animation-play-state:paused]",
          )}
        />
      ))}
    </div>
  );
}
