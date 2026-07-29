/**
 * Where a question is stored: in the URL, so an answer is shareable and Back works.
 *
 * Its own module so the hero can link into the chat without pulling `ChatView` — and the AI SDK
 * with it — into the landing page's bundle.
 */
export function chatHref(question: string) {
  return `/chat?query=${encodeURIComponent(question)}`;
}
