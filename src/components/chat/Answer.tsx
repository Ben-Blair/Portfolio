"use client";

import Link from "next/link";
import { Fragment, type CSSProperties } from "react";

import { useChatMedia } from "@/components/chat/MediaCatalog";
import { MediaBlock } from "@/components/media/MediaBlock";
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

const FADE_IN =
  "animate-in fill-mode-both duration-500 ease-out fade-in-0 motion-reduce:animate-none";

/**
 * How a picture arrives.
 *
 * Text fades where it stands, because it's already the shape of the paragraph it belongs to. A
 * picture isn't — it's a few hundred pixels of new page opening up under the words — so it gets
 * the lift the written panels use (`.reveal-lift` in globals.css), rising the last of the way as
 * it becomes visible. Turning one on in place reads as a hole being filled; this reads as
 * something arriving.
 *
 * The travel outlasts the fade, the same relationship the Me panel's header uses and for the same
 * reason: the picture is fully legible while it's still settling, so the eye gets it a beat before
 * the movement finishes rather than waiting on it. Both are longer than the text's own fade — it's
 * a bigger thing to move, and moving it at the speed of a line of prose looks hurried.
 */
const MEDIA_FADE_MS = 420;
const MEDIA_LIFT_MS = 620;

/**
 * How the model cites a picture: `[media:high-power-rocket/stats]`.
 *
 * IDs come from a closed list built by `getChatMedia` and written into the system prompt, so the
 * model is copying from a menu rather than naming files. One that isn't in the catalog draws
 * nothing at all — see `Answer` below. No whitespace inside, which two things depend on: the
 * partial-token guard, and the guarantee that the typed/faded seam can never land mid-token.
 */
const MEDIA_TOKEN = /\[media:([^\]\s]+)\]/g;

/**
 * The paths worth making clickable when the model writes one out.
 *
 * Deliberately not a general URL matcher. These are the two the prompt actually asks for, they're
 * internal, and they're the ones where leaving inert text on screen reads as a dead end.
 */
const INTERNAL_LINK = /\/(?:projects\/[a-z0-9-]+|resume)\b/g;

/** A stretch of text that renders the same way, and where it starts in the answer. */
type Run = { text: string; bold: boolean; href?: string; start: number };

/**
 * One thing in the answer: a paragraph of prose, or a picture standing on its own.
 *
 * Both carry their bounds in the full answer rather than being independent pieces, because the
 * typed/faded seam can fall anywhere and the fade below is decided by comparing against it.
 */
type Node =
  | { kind: "text"; text: string; start: number; end: number }
  | { kind: "media"; id: string; start: number; end: number };

/**
 * Blank line separated, the way the system prompt asks the model to write, then split again
 * wherever a media token appears.
 *
 * Media has to come out at this level rather than inside a paragraph: every `MediaBlock` variant
 * roots at a `<figure>`, paragraphs render as `<p>`, and a figure inside a paragraph is invalid
 * nesting that the HTML parser silently repairs by closing the `<p>` early. So a picture is a
 * sibling of the prose, never a child of it.
 *
 * Splitting on the token anywhere — not only on a line of its own, which is what the prompt asks
 * for — is what keeps a token the model tacked onto the end of a sentence from rendering as
 * literal text. It costs a paragraph break at that point, which is the cheaper failure.
 */
function splitNodes(text: string): Node[] {
  const nodes: Node[] = [];

  const pushText = (chunk: string, start: number) => {
    // Blank chunks are what a token on its own line leaves either side of itself. They draw
    // nothing but would still collect the wrapper's row gap, quietly doubling the space around
    // every picture — and they'd count as lines in the cascade below, which is worse: a stagger
    // slot where nothing arrives reads as the answer stalling.
    if (chunk.trim()) nodes.push({ kind: "text", text: chunk, start, end: start + chunk.length });
  };

  const pushParagraph = (body: string, offset: number) => {
    const token = new RegExp(MEDIA_TOKEN.source, "g");
    let read = 0;
    let hit: RegExpExecArray | null;

    while ((hit = token.exec(body)) !== null) {
      pushText(body.slice(read, hit.index), offset + read);
      nodes.push({
        kind: "media",
        id: hit[1],
        start: offset + hit.index,
        end: offset + hit.index + hit[0].length,
      });
      read = hit.index + hit[0].length;
    }

    pushText(body.slice(read), offset + read);
  };

  const breaks = /\n{2,}/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = breaks.exec(text)) !== null) {
    pushParagraph(text.slice(cursor, match.index), cursor);
    cursor = match.index + match[0].length;
  }
  pushParagraph(text.slice(cursor), cursor);

  return nodes;
}

/**
 * Splits a paragraph into bold, linked and plain runs.
 *
 * `**` is the one piece of markdown the system prompt allows and the model reliably uses, so
 * it's the one piece parsed here. Everything else stays literal — this is the answer surface,
 * not a document renderer, and a half-supported markdown dialect reads worse than none. Links
 * are the exception, and not as markdown: the model writes the path as prose, and this turns
 * that path into something you can click rather than something you have to retype.
 */
function splitRuns(paragraph: string, offset: number) {
  const runs: Run[] = [];
  const bold = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = bold.exec(paragraph)) !== null) {
    if (match.index > cursor) {
      runs.push(...splitLinks(paragraph.slice(cursor, match.index), offset + cursor, false));
    }
    // Past the opening asterisks, which aren't rendered and so don't count as ground covered.
    runs.push(...splitLinks(match[1], offset + match.index + 2, true));
    cursor = match.index + match[0].length;
  }
  if (cursor < paragraph.length) {
    runs.push(...splitLinks(paragraph.slice(cursor), offset + cursor, false));
  }

  return runs;
}

/** The second pass, run inside each bold or plain stretch so the two can overlap. */
function splitLinks(text: string, offset: number, bold: boolean): Run[] {
  const runs: Run[] = [];
  const link = new RegExp(INTERNAL_LINK.source, "g");
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = link.exec(text)) !== null) {
    if (match.index > cursor) {
      runs.push({ text: text.slice(cursor, match.index), bold, start: offset + cursor });
    }
    runs.push({ text: match[0], bold, href: match[0], start: offset + match.index });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    runs.push({ text: text.slice(cursor), bold, start: offset + cursor });
  }

  return runs;
}

/**
 * An answer, with everything from `fadeFrom` onward fading in a line at a time.
 *
 * The seam can fall anywhere — mid-paragraph, inside a bold phrase — so the text is parsed into
 * runs that know their offset rather than split into independent pieces. Rendering the two
 * halves separately would break a paragraph in two at the point the typing stopped.
 *
 * Pictures wait for the typing to stop. `ChatView` already documents why the answer isn't
 * centred — re-laying it out while it's being read makes the text crawl upward under your eyes —
 * and dropping a 16:10 figure into the middle of an answer with prose still arriving below it is
 * that same problem several hundred pixels tall. Held back, they arrive on the tail's fade with
 * everything else, which is also when the answer stops moving.
 *
 * `mirrored` says the prose is being announced somewhere else — the live region under an answer
 * that's still arriving — so the paragraphs here are decoration and are hidden from screen
 * readers. It sits on the paragraphs rather than on a wrapper because the pictures between them
 * are not decoration: a carousel and a click-to-play video are things to use, and `aria-hidden` on
 * an ancestor is not something a descendant can take back. A panel passes nothing, and stays
 * readable; a streamed answer stops passing it once it has finished arriving, at which point the
 * mirror steps aside and this becomes the copy everyone reads.
 */
export function Answer({
  text,
  fadeFrom,
  caret,
  mirrored = false,
}: {
  text: string;
  fadeFrom: number | null;
  caret: boolean;
  mirrored?: boolean;
}) {
  const catalog = useChatMedia();

  // `caret` is the whole condition: it is false in exactly the two states where the answer has
  // stopped growing — fully typed, or handed off to the tail — and `fadeFrom` is only ever set in
  // the second of those. So a picture that draws at all draws while the cascade is running, and
  // counts as one of its lines.
  const nodes = splitNodes(text).filter(
    (node) => node.kind === "text" || (!caret && catalog[node.id] !== undefined),
  );

  // Counted across the whole answer rather than per paragraph, so the stagger runs top to bottom
  // through the tail instead of restarting at every blank line.
  const lines =
    fadeFrom === null ? 0 : nodes.filter((node) => node.end > fadeFrom).length;
  const stagger = Math.min(LINE_STAGGER_MS, FADE_SPREAD_MS / Math.max(1, lines - 1));

  // Every run in a line shares the line's delay — bold splits a paragraph into pieces, and the
  // pieces are still one line, so they have to arrive together.
  const delay = (line: number) =>
    ({
      "--tw-animation-delay": `${Math.round(line * stagger)}ms`,
    }) as CSSProperties;

  const fadeIn = (chunk: string, line: number) => (
    <span className={FADE_IN} style={delay(line)}>
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

  // The caret belongs on the last thing anyone is reading, which is the last line of prose. If
  // the answer ends on a picture — which is what the prompt asks for — the last node isn't it.
  const lastProse = nodes.reduce(
    (last, node, index) => (node.kind === "text" ? index : last),
    -1,
  );

  let line = -1;
  const drawn = new Map<string, number>();

  return (
    <div className="space-y-4">
      {nodes.map((node, index) => {
        const faded = fadeFrom !== null && node.end > fadeFrom;
        if (faded) line++;

        if (node.kind === "media") {
          // Keyed by content, not position. A run index shifts the frame a bold pair closes and
          // `withoutPartialBold` stops removing its marker, and `start` shifts with it — either
          // would remount the block, which resets `WhenNear` to its placeholder, restarts a video
          // from the first frame, and reloads a YouTube iframe.
          const nth = (drawn.get(node.id) ?? 0) + 1;
          drawn.set(node.id, nth);

          return (
            <div
              key={`${node.id}:${nth}`}
              // Always, not only inside a tail. A picture has one moment of arrival — the frame
              // the typing stops — and on an answer short enough to be typed out whole there is
              // no fade running for it to join, so without this it would simply be there.
              className="reveal-lift py-2"
              style={
                {
                  // In step with the tail when there is one, so the picture takes its turn in the
                  // cascade rather than cutting to the front of it.
                  animationDelay: faded ? `${Math.round(line * stagger)}ms` : "0ms",
                  "--reveal-fade": `${MEDIA_FADE_MS}ms`,
                  "--reveal-lift": `${MEDIA_LIFT_MS}ms`,
                } as CSSProperties
              }
            >
              <MediaBlock media={catalog[node.id]} />
            </div>
          );
        }

        return (
          <p
            key={`text:${node.start}`}
            aria-hidden={mirrored || undefined}
            className="whitespace-pre-wrap text-[15px] leading-[1.7] text-neutral-700"
          >
            {splitRuns(node.text, node.start).map((run, runIndex) => {
              let content = render(run, line);

              if (run.bold) {
                content = <strong className="font-semibold text-neutral-900">{content}</strong>;
              }
              if (run.href) {
                content = (
                  <Link
                    href={run.href}
                    // Out of the tab order for as long as the paragraph around it is hidden.
                    // Focusable and `aria-hidden` at the same time is the one combination to
                    // avoid: the link would still be tabbable while being invisible to the
                    // screen reader that just landed on it.
                    tabIndex={mirrored ? -1 : undefined}
                    className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-900"
                  >
                    {content}
                  </Link>
                );
              }

              return <Fragment key={runIndex}>{content}</Fragment>;
            })}
            {caret && index === lastProse && (
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
 *
 * Applied to what has been typed, never to the answer itself. It removes a marker from the middle
 * of the string, so every index after it shifts by two — feed that to the typewriter and the next
 * token makes the string stop matching what it had already typed, and the whole answer restarts
 * from the first character. `withoutPartialMedia` is the one that's safe to move upstream.
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
 * Hides a media token that hasn't finished arriving.
 *
 * Every prefix of one, not just the ones far enough along to recognise: `[`, `[me`, `[media:high-p`.
 * At 280 characters a second none of those should last long enough to see, except that the typing
 * stops the moment it catches up with what has actually streamed in — so a chunk that happens to
 * end on `[med` strands that fragment on screen for however long the next chunk takes to arrive.
 *
 * Unlike the bold guard this only ever cuts the end off, which is what makes it safe to apply to
 * the answer *before* the typewriter sees it: the result only grows as the answer does, so the
 * typing never decides it's looking at a different answer and starts over. Doing it there rather
 * than to the typed prefix is also the only way to cover the tail — pressing Stop mid-token ends
 * the answer with a half-written one, and nothing downstream of that point ever looks at it again.
 */
export function withoutPartialMedia(text: string) {
  return text.replace(/\[(?:m(?:e(?:d(?:i(?:a(?::[^\]\s]*)?)?)?)?)?)?$/, "");
}

/**
 * The answer with its media tokens taken out, for the places that want the words alone — the
 * live region a screen reader hears, and the check for whether anything has arrived yet.
 */
export function withoutMediaTokens(text: string) {
  return text
    .replace(new RegExp(MEDIA_TOKEN.source, "g"), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Moves the typed/faded seam forward to the next gap between words.
 *
 * The typing stops on whatever character it happened to reach, which is usually mid-word. Left
 * there, the seam would draw half a word solid and fade the other half in beside it. Letting the
 * word in progress finish costs a few characters appearing at once and nobody notices.
 *
 * It also puts the seam out of reach of a media token, which contains no whitespace: a cursor
 * that lands inside one is pushed past its closing bracket, so a picture is never half-faded.
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
