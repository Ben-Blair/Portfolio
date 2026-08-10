import type { Metadata } from "next";
import { Suspense } from "react";

import { ChatView } from "@/components/chat/ChatView";
import { MediaCatalogProvider } from "@/components/chat/MediaCatalog";
import { BackHome } from "@/components/site/BackHome";
import { getChatMediaMap } from "@/lib/chatMedia";
import { profile } from "@content/profile";

export const metadata: Metadata = {
  title: "Chat",
  description: `Ask ${profile.fullName} anything.`,
  // Every answer here lives in a query string, so there's nothing stable to index — the pages
  // the panels link out to are the canonical version of the same content.
  robots: { index: false, follow: true },
};

/**
 * `/chat` — the page the hero input sends you to.
 *
 * All of the interaction is in `ChatView`, which reads the question off the URL. This shell only
 * holds the Suspense boundary that `useSearchParams` needs in order for the rest to stay
 * prerendered — and reads the media catalog, which is the one thing on this page that has to come
 * off the filesystem. `getChatMediaMap` is the same call the system prompt is built from, so what
 * the model can cite and what the browser can draw are, by construction, the same list.
 */
export default function ChatPage() {
  return (
    <>
      {/* Outside the boundary so the avatar is in the initial HTML rather than waiting on the
          client render that `useSearchParams` forces. */}
      <BackHome />
      <MediaCatalogProvider catalog={getChatMediaMap()}>
        <Suspense fallback={<div className="min-h-[100svh] bg-white" />}>
          <ChatView />
        </Suspense>
      </MediaCatalogProvider>
    </>
  );
}
