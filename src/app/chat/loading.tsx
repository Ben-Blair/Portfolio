/**
 * What `/chat` shows while `ChatView` is still being fetched.
 *
 * On a first visit that JS chunk is the pause — Fun, Me, Skills, Contact all live behind it.
 * The question bubble itself is already on screen from the root overlay (see `TurnOverlay`);
 * this file exists so Next will swap away from the hero immediately instead of leaving it up
 * until the chunk lands. White, empty, same size as the page: the overlay sits on top and the
 * swap has nothing of its own to show.
 */
export default function Loading() {
  return <div className="min-h-[100svh] bg-white" />;
}
