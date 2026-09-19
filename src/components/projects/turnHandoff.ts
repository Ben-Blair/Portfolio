import { PANEL_QUESTIONS, PROJECTS_QUESTION } from "@/components/chat/questions";

/**
 * A chat turn in flight, handed between the click, a persistent overlay, and the page that
 * finishes it.
 *
 * The problem this exists to solve: a first visit has nothing of the destination in cache.
 * `/projects` is dynamic (it reads `searchParams`) so Next doesn't prefetch the page, and `/chat`
 * is a client tree heavy enough that Fun, Me and the rest wait on a JS chunk. In both cases the
 * typing dots used to start only once that work landed — a dead pause, then a flash of animation
 * that had already run out of time.
 *
 * The overlay in the root layout is the fix for the pause. It's already on the page you clicked
 * from, so the bubble can paint in the same tick as the click, and the fetch happens underneath
 * an animation whose job was always to cover a wait. `loading.tsx` on `/projects` is still what
 * earns that route a prefetchable shell — keep it — but it is no longer the first paint; it's
 * the fallback for a hard load, and a second copy sitting under the overlay during a click.
 *
 * That splits one turn across an unmount, which is what this module is for. Three things have to
 * agree and none of them can hand a prop to the next:
 *
 * - **The click** is the only thing that knows a turn is starting. The overlay can paint because
 *   it subscribes here; the destination page cannot, because it doesn't exist yet.
 * - **The overlay** (`TurnOverlay`) paints that opening frame, and is the only thing that knows
 *   when it appeared.
 * - **The destination** (`ProjectsIntro`, `ChatView`) finishes the turn — and has to know it is
 *   continuing one rather than starting one, or the bubble plays its entrance a second time and
 *   the thinking beat gets served twice.
 *
 * Module-level for the same reason `PillRow`'s lozenge history is, and the note there applies
 * word for word: these handoffs cross an unmount, which is the one thing React storage cannot
 * survive. Safe as a singleton — only one navigation is ever in flight.
 */

export { PROJECTS_QUESTION };

export type TurnSurface = "chat" | "projects";

export type TurnSnapshot = {
  question: string;
  surface: TurnSurface;
  path: string;
};

/**
 * How long an unopened arm stays good for.
 *
 * Not a timing allowance — the overlay paints in the same tick as the click, nowhere near this.
 * It's for the turn that never gets played at all, because the visitor clicked Projects and then
 * immediately clicked something else. Without it the arm would sit there indefinitely and the next
 * `/projects` navigation of any kind — the "See it in practice" link on `/skills`, the "Back to
 * projects" link on a project page — would open on a question nobody asked.
 */
const ARM_TTL_MS = 5_000;

/** Safety net if a destination never claims the overlay (a cancelled navigation, Back). */
const OPEN_TTL_MS = 12_000;

type LiveTurn = TurnSnapshot & {
  armedAt: number;
  openedAt: number | null;
};

let live: LiveTurn | null = null;
let ttlTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * The thinking beat in progress, kept outside any one page.
 *
 * Overlay, loading shell, and destination each mount their own dots, and a fast pill-to-pill
 * click unmounts one while the next is still fetching. The leftover those pages subtract from
 * `PANEL_THINKING_MS` has to survive that, or production — where the swap is slow enough to
 * see — restarts the wait (and the animation) on every tab. Generation so a destination that
 * lost the race can't end the beat the next pill just claimed.
 */
let thinkStartedAt: number | null = null;
let thinkGen = 0;

/**
 * Stable snapshot for `useSyncExternalStore`. A new object on every read would fail `Object.is`
 * and loop the overlay's render.
 */
let snapshot: TurnSnapshot | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function publish() {
  const next = live
    ? { question: live.question, surface: live.surface, path: live.path }
    : null;
  if (
    snapshot === next ||
    (snapshot !== null &&
      next !== null &&
      snapshot.question === next.question &&
      snapshot.surface === next.surface &&
      snapshot.path === next.path)
  ) {
    return;
  }
  snapshot = next;
  emit();
}

function clearTtl() {
  if (ttlTimer !== null) {
    clearTimeout(ttlTimer);
    ttlTimer = null;
  }
}

function expireAfter(ms: number) {
  clearTtl();
  ttlTimer = setTimeout(() => {
    live = null;
    ttlTimer = null;
    publish();
  }, ms);
}

function parseTurnHref(href: string): TurnSnapshot | null {
  const [path, search] = href.split("?");
  const params = new URLSearchParams(search ?? "");

  if (path === "/projects" && params.get("ask") === "1") {
    return {
      question: params.get("query") || PROJECTS_QUESTION,
      surface: "projects",
      path,
    };
  }

  if (path === "/chat") {
    const panel = params.get("panel");
    const query = params.get("query");
    if (panel && panel in PANEL_QUESTIONS) {
      return {
        question: query || PANEL_QUESTIONS[panel as keyof typeof PANEL_QUESTIONS],
        surface: "chat",
        path,
      };
    }
    if (query) {
      return {
        question: query,
        surface: "chat",
        path,
      };
    }
  }

  return null;
}

/**
 * Start or continue the shared thinking beat. Returns the generation a caller must hand back
 * to `endThink` so a stale page can't clear a beat that has since been claimed by another pill.
 */
export function beginThink(): number {
  if (thinkStartedAt == null) {
    thinkStartedAt = performance.now();
    thinkGen += 1;
  }
  return thinkGen;
}

/**
 * Same clock, new owner — Skills was thinking, then Projects was clicked. The leftover
 * continues; the page that was answering Skills may not end it.
 */
function retargetThink(): number {
  thinkStartedAt ??= performance.now();
  thinkGen += 1;
  return thinkGen;
}

/** Clear the beat only if `gen` is still the current one. */
export function endThink(gen: number) {
  if (gen !== thinkGen) return;
  thinkStartedAt = null;
}

/** Back/forward: nothing on screen owns this beat anymore. */
export function clearThink() {
  thinkStartedAt = null;
  thinkGen += 1;
}

/**
 * Arm the turn, if `href` is one that plays it.
 *
 * Takes the URL rather than a boolean so a caller can pass whatever it was about to navigate to
 * and be done with it: `chatHref` resolves to any of five destinations and only one of them used
 * to be this one. Asking each call site to work out which is asking it to drift.
 *
 * When the visitor is already on `/chat` and staying there, the overlay stays down — switching
 * Me to Fun is `ChatView`'s own thinking beat, and an overlay on top of a page that's already
 * showing the turn would be the bubble arriving twice. The think clock still starts (or
 * continues), so a production remount of that tree can pick up mid-beat instead of restarting.
 *
 * Replacing an already-open overlay keeps `openedAt` and the dots that are on screen: only the
 * question changes. That's the Skills → Projects hop, where a fresh overlay used to remount
 * the bubble and look like the animation reset.
 */
export function armTurn(href: string) {
  const parsed = parseTurnHref(href);
  if (!parsed) return;

  if (parsed.path === "/chat" && window.location.pathname === "/chat") {
    beginThink();
    return;
  }

  const now = performance.now();
  retargetThink();

  if (live && live.openedAt !== null) {
    live = { ...parsed, armedAt: live.armedAt, openedAt: live.openedAt };
  } else {
    live = { ...parsed, armedAt: now, openedAt: now };
  }
  expireAfter(OPEN_TTL_MS);
  publish();
}

export function subscribeTurn(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current overlay snapshot. Stable between changes; null on the server. */
export function turnSnapshot(): TurnSnapshot | null {
  return snapshot;
}

export function getServerTurnSnapshot(): TurnSnapshot | null {
  return null;
}

/**
 * The turn waiting to be opened, or null.
 *
 * Pure, which matters twice over: it seeds state during a render, and React's development
 * double-invoke will call it twice for one mount. Used by `/projects`'s loading shell as a
 * backup copy under the overlay.
 */
export function armedTurn(): { question?: string } | null {
  if (!live) return null;
  if (live.openedAt === null && performance.now() - live.armedAt > ARM_TTL_MS) return null;
  return { question: live.question };
}

/**
 * Record that the opening frame is on screen.
 *
 * Idempotent — `armTurn` already opens it, and the overlay's effect may call this again.
 */
export function openTurn() {
  if (!live || live.openedAt !== null) return;
  live = { ...live, openedAt: performance.now() };
  expireAfter(OPEN_TTL_MS);
}

/**
 * How long the thinking beat has been up, or null if there wasn't one — a hard load, or a
 * navigation that never armed. Prefers the shared think clock over the overlay's `openedAt`,
 * so a remount after the overlay has already come off still sees the leftover. Pure, for the
 * same two reasons `armedTurn` is; `endThink` is what clears the clock, `endTurn` the overlay.
 */
export function turnElapsed(): number | null {
  if (thinkStartedAt != null) return performance.now() - thinkStartedAt;
  return live?.openedAt == null ? null : performance.now() - live.openedAt;
}

/**
 * Hide the overlay. Does not end the thinking beat — the destination is still on the dots
 * and will `endThink` when it actually answers.
 *
 * `claim` is the path this page is finishing. A Skills tree that mounts after Projects was
 * already clicked must not take the overlay off the turn that's now in flight.
 */
export function endTurn(claim?: { path: string }) {
  if (claim && live && live.path !== claim.path) return;
  if (!live && !snapshot) return;
  clearTtl();
  live = null;
  publish();
}
