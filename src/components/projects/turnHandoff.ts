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
 * Arm the turn, if `href` is one that plays it.
 *
 * Takes the URL rather than a boolean so a caller can pass whatever it was about to navigate to
 * and be done with it: `chatHref` resolves to any of five destinations and only one of them used
 * to be this one. Asking each call site to work out which is asking it to drift.
 *
 * No-op when the visitor is already on `/chat` and staying there — switching Me to Fun is
 * `ChatView`'s own thinking beat, and an overlay on top of a page that's already showing the
 * turn would be the bubble arriving twice.
 */
export function armTurn(href: string) {
  const parsed = parseTurnHref(href);
  if (!parsed) return;

  if (parsed.path === "/chat" && window.location.pathname === "/chat") return;

  // Opened in the same tick as the click: the overlay paints synchronously via
  // `useSyncExternalStore`, so the clock should start now rather than in an effect that may
  // lose a race to a cached destination page.
  const now = performance.now();
  live = { ...parsed, armedAt: now, openedAt: now };
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
 * How long the opening frame has been up, or null if there wasn't one — a hard load, or a
 * navigation that never armed. Pure, for the same two reasons `armedTurn` is; `endTurn` is what
 * clears it.
 */
export function turnElapsed(): number | null {
  return live?.openedAt == null ? null : performance.now() - live.openedAt;
}

/** Done. The next turn starts from nothing. Hides the overlay. */
export function endTurn() {
  if (!live && !snapshot) return;
  clearTtl();
  live = null;
  publish();
}
