import { cn } from "@/lib/utils";

/**
 * The question you asked, drawn as an iMessage bubble you just sent.
 *
 * It's on screen for the wait and no longer: once the answer starts arriving it fades out and
 * the space it occupied closes up, so the finished page is just the answer. The bubble exists to
 * make the jump from the hero input to `/chat` feel like sending a text rather than loading a
 * page, and to give the wait something to be about.
 *
 * The collapse is a `1fr → 0fr` grid row rather than a height transition, because the bubble's
 * height depends on how long the question is and `height: auto` doesn't animate. The child needs
 * `overflow-hidden` for the row to be able to crush it.
 *
 * `lift` is the panel version of leaving. Instead of being crushed in place it travels upward out
 * of the row as the row shuts under it — the same beat the typing dots spend dropping downward, so
 * the two clear the screen in opposite directions and the answer arrives into an empty page rather
 * than over the top of them. That's why this mode drops `overflow-hidden`: the bubble has to be
 * allowed out of the box it's collapsing inside.
 */
export function QuestionBubble({
  question,
  hidden,
  lift = false,
}: {
  question: string;
  hidden: boolean;
  lift?: boolean;
}) {
  return (
    <div
      aria-hidden={hidden}
      className={cn(
        "grid transition-[grid-template-rows] ease-in-out motion-reduce:transition-none",
        // Matched to PANEL_EXIT_MS, so the gap is shut on the frame the answer mounts.
        lift ? "duration-[220ms]" : "duration-[380ms]",
      )}
      style={{ gridTemplateRows: hidden ? "0fr" : "1fr" }}
    >
      {/* Fades faster than the row closes, so the bubble is gone before the gap finishes
          shutting rather than being visibly squashed on the way out. */}
      <div
        className={cn(
          "transition-opacity ease-out motion-reduce:transition-none",
          // `min-h-0` is what lets the row shrink past its content once the crushing job isn't
          // being done by `overflow-hidden` — a grid item's automatic minimum size is its content
          // otherwise, and the row would refuse to close.
          lift ? "min-h-0 duration-[220ms]" : "overflow-hidden duration-200",
          hidden ? "opacity-0" : "opacity-100",
        )}
      >
        {/* The travel rides on the wrapper, not the bubble: the bubble owns the `animate-in`
            entrance, and a transition on the same element would fight it. */}
        <div
          className={cn(
            "flex justify-end pb-8",
            lift &&
              cn(
                "transition-transform duration-[220ms] ease-out motion-reduce:transition-none",
                hidden && "-translate-y-4",
              ),
          )}
        >
          <p className="max-w-[80%] animate-in rounded-3xl rounded-br-lg bg-[#0b84ff] px-4 py-2.5 text-[15px] leading-[1.45] break-words whitespace-pre-wrap text-white duration-300 ease-out fade-in-0 zoom-in-95 slide-in-from-bottom-2 motion-reduce:animate-none">
            {question}
          </p>
        </div>
      </div>
    </div>
  );
}
