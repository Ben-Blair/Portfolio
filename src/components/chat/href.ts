import { matchPanel } from "@/components/chat/panelIntent";

/**
 * Where a question is stored: in the URL, so an answer is shareable and Back works.
 *
 * Its own module so the hero can link into the chat without pulling `ChatView` — and the AI SDK
 * with it — into the landing page's bundle.
 *
 * A question that just asks what a pill already answers — "who are you", "what are you good
 * at" — goes to that pill's panel instead of the model, the same answer a click would give.
 */
export function chatHref(question: string) {
  return panelHref(matchPanel(question), question);
}

/**
 * The URL a given destination answers at, with the question carried along so whatever renders it can
 * show what was actually typed.
 *
 * Split out from `chatHref` because the regex is no longer the only thing that produces a
 * destination — the classifier behind `/api/route-intent` produces the same keys for phrasings no
 * pattern caught, and both need to turn a key into the same URL. A `null` key is "the model should
 * answer this", which is `/chat` with nothing but the query.
 *
 * `projects` is the fork. It's the one pill with no `panel` (see `blocks/panels.tsx`), because the
 * project list is its own answer — so it goes to the page rather than into the chat, and `?ask=1` is
 * what asks that page to play the question-and-thinking-beat before it.
 */
export function panelHref(panel: string | null, question: string) {
  const query = encodeURIComponent(question);
  if (panel === "projects") return `/projects?ask=1&query=${query}`;
  if (panel) return `/chat?panel=${panel}&query=${query}`;
  return `/chat?query=${query}`;
}
