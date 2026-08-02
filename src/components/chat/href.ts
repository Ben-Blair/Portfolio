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
  const panel = matchPanel(question);
  if (panel) return `/chat?panel=${panel}&query=${encodeURIComponent(question)}`;
  return `/chat?query=${encodeURIComponent(question)}`;
}
