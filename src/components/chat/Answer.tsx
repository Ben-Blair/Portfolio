import { Fragment, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * How an answer gets on screen, whoever wrote it.
 *
 * The model's answers stream in and are typed out a character at a time; the panels behind the
 * pills are written by hand and replayed the same way. Both end up here, which is the point —
 * a written answer that rendered even slightly differently would give itself away.
 */

/**
 * The line-by-line fade that finishes an answer the typing didn't get to.
 *
 * A line here is a paragraph — the unit the text is written in, and the unit someone reads in.
 * Fading word by word draws the eye along the sentence and turns reading into waiting; fading a
 * whole line at a time lands each thought already legible, top to bottom.
 *
 * `SPREAD` is a budget, not a duration: a two-line tail uses the natural per-line gap, while a
 * six-line one compresses to fit, so the reveal takes about the same time no matter how far
 * behind the typing was. Without the cap, a long answer would ripple in for several seconds.
 */
const LINE_STAGGER_MS = 130;
const FADE_SPREAD_MS = 700;

/** A stretch of text that renders the same way, and where it starts in the answer. */
type Run = { text: string; bold: boolean; start: number };

/**
 * Blank line separated, the way the system prompt asks the model to write. Like
 * `split(/\n{2,}/)`, except each paragraph remembers where in the answer it began.
 */
function splitParagraphs(text: string) {
  const paragraphs: { text: string; start: number }[] = [];
  const breaks = /\n{2,}/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = breaks.exec(text)) !== null) {
    paragraphs.push({ text: text.slice(cursor, match.index), start: cursor });
    cursor = match.index + match[0].length;
  }
  paragraphs.push({ text: text.slice(cursor), start: cursor });

  return paragraphs;
}

/**
 * Splits a paragraph into bold and plain runs.
 *
 * `**` is the one piece of markdown the system prompt allows and the model reliably uses, so
 * it's the one piece parsed here. Everything else stays literal — this is the answer surface,
 * not a document renderer, and a half-supported markdown dialect reads worse than none.
 */
function splitRuns(paragraph: string, offset: number) {
  const runs: Run[] = [];
  const bold = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = bold.exec(paragraph)) !== null) {
    if (match.index > cursor) {
      runs.push({
        text: paragraph.slice(cursor, match.index),
        bold: false,
        start: offset + cursor,
      });
    }
    // Past the opening asterisks, which aren't rendered and so don't count as ground covered.
    runs.push({ text: match[1], bold: true, start: offset + match.index + 2 });
    cursor = match.index + match[0].length;
  }
  if (cursor < paragraph.length) {
    runs.push({
      text: paragraph.slice(cursor),
      bold: false,
      start: offset + cursor,
    });
  }

  return runs;
}

/**
 * An answer, with everything from `fadeFrom` onward fading in a line at a time.
 *
 * The seam can fall anywhere — mid-paragraph, inside a bold phrase — so the text is parsed into
 * runs that know their offset rather than split into independent pieces. Rendering the two
 * halves separately would break a paragraph in two at the point the typing stopped.
 */
export function Answer({
  text,
  fadeFrom,
  caret,
}: {
  text: string;
  fadeFrom: number | null;
  caret: boolean;
}) {
  const paragraphs = splitParagraphs(text);

  // Counted across the whole answer rather than per paragraph, so the stagger runs top to bottom
  // through the tail instead of restarting at every blank line.
  const lines =
    fadeFrom === null
      ? 0
      : paragraphs.filter((paragraph) => paragraph.start + paragraph.text.length > fadeFrom).length;
  const stagger = Math.min(LINE_STAGGER_MS, FADE_SPREAD_MS / Math.max(1, lines - 1));

  // Every run in a line shares the line's delay — bold splits a paragraph into pieces, and the
  // pieces are still one line, so they have to arrive together.
  const delay = (line: number) =>
    ({
      "--tw-animation-delay": `${Math.round(line * stagger)}ms`,
    }) as CSSProperties;

  const fadeIn = (chunk: string, line: number) => (
    <span
      className="animate-in fill-mode-both duration-500 ease-out fade-in-0 motion-reduce:animate-none"
      style={delay(line)}
    >
      {chunk}
    </span>
  );

  const render = (run: Run, line: number) => {
    if (fadeFrom === null || run.start + run.text.length <= fadeFrom) return run.text;
    if (run.start >= fadeFrom) return fadeIn(run.text, line);

    // The seam falls inside this run: what the typing already reached stays put, and only the
    // rest of the line fades — the alternative is re-fading text that's been on screen.
    const seam = fadeFrom - run.start;
    return (
      <>
        {run.text.slice(0, seam)}
        {fadeIn(run.text.slice(seam), line)}
      </>
    );
  };

  let line = -1;

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => {
        if (fadeFrom !== null && paragraph.start + paragraph.text.length > fadeFrom) line++;

        return (
          <p key={index} className="whitespace-pre-wrap text-[15px] leading-[1.7] text-neutral-700">
            {splitRuns(paragraph.text, paragraph.start).map((run, runIndex) =>
              run.bold ? (
                <strong key={runIndex} className="font-semibold text-neutral-900">
                  {render(run, line)}
                </strong>
              ) : (
                <Fragment key={runIndex}>{render(run, line)}</Fragment>
              ),
            )}
            {caret && index === paragraphs.length - 1 && (
              <span className="ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[0.12em] animate-caret-blink rounded-full bg-neutral-400 align-baseline motion-reduce:animate-none" />
            )}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Hides a `**` that hasn't found its pair yet.
 *
 * The answer is revealed a character at a time, so mid-word the text reads `…he built **Flu` and
 * the parser above — which only matches complete pairs — would leave the asterisks sitting there
 * as literal characters until the closing ones arrived. Dropping the dangling marker lets the
 * word type out unstyled and go bold when it closes, a far smaller flicker than two asterisks
 * appearing and vanishing mid-sentence.
 */
export function withoutPartialBold(text: string) {
  let visible = text;

  if ((visible.split("**").length - 1) % 2 === 1) {
    const opener = visible.lastIndexOf("**");
    visible = visible.slice(0, opener) + visible.slice(opener + 2);
  }

  // The marker can be half-typed too.
  return visible.endsWith("*") ? visible.slice(0, -1) : visible;
}

/**
 * Moves the typed/faded seam forward to the next gap between words.
 *
 * The typing stops on whatever character it happened to reach, which is usually mid-word. Left
 * there, the seam would draw half a word solid and fade the other half in beside it. Letting the
 * word in progress finish costs a few characters appearing at once and nobody notices.
 */
export function wordBoundary(text: string, index: number) {
  let seam = index;
  while (seam < text.length && !/\s/.test(text[seam])) seam++;
  return seam;
}

/**
 * iOS's spinner: the received bubble that says the other person is writing.
 *
 * `leaving` is the beat where it stops saying that. The bounce is paused rather than removed, so
 * the dots hold wherever they happened to be instead of snapping level, and the bubble drifts down
 * as it fades — away from the question, which is going up.
 */
export function TypingDots({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      className={cn(
        "flex w-fit items-center gap-1.5 rounded-3xl rounded-bl-lg bg-neutral-100 px-4 py-3.5",
        // `translate`, not `transform`: Tailwind's `translate-y-*` sets the standalone property,
        // and a transition that only names `transform` lets the dots snap down instead of drift.
        "transition-[opacity,translate] duration-[220ms] ease-out motion-reduce:transition-none",
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
