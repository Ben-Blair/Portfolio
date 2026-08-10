"use client";

import { createContext, useContext } from "react";

import type { Media } from "@/lib/schema";

/**
 * The media an answer is allowed to draw, keyed by the ID the model cites.
 *
 * Built on the server by `getChatMedia` — which also writes the list the model reads — and handed
 * down from `chat/page.tsx`. Context rather than a prop because `Answer` is reached from two
 * places, the streamed answer and every written panel, and neither of the paths between wants to
 * know about media.
 *
 * Empty by default, so an `Answer` rendered outside the provider quietly draws no media instead of
 * throwing. That's the right answer for a static page and it means a missing provider can never
 * take the text down with it.
 */
const MediaCatalogContext = createContext<Record<string, Media>>({});

export function MediaCatalogProvider({
  catalog,
  children,
}: {
  catalog: Record<string, Media>;
  children: React.ReactNode;
}) {
  return (
    <MediaCatalogContext.Provider value={catalog}>{children}</MediaCatalogContext.Provider>
  );
}

export function useChatMedia() {
  return useContext(MediaCatalogContext);
}
