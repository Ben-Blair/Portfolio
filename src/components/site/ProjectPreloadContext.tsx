"use client";

import { createContext, useContext } from "react";

/**
 * The URL to warm on Projects-pill hover, computed server-side once in the root layout (see
 * `getFirstProjectPreload` in `src/lib/content.ts`) and handed down here so `PillRow` — mounted
 * on both the hero and every docked page — doesn't need its own filesystem access to find it.
 */
const ProjectPreloadContext = createContext<string | undefined>(undefined);

export function ProjectPreloadProvider({
  url,
  children,
}: {
  url: string | undefined;
  children: React.ReactNode;
}) {
  return <ProjectPreloadContext.Provider value={url}>{children}</ProjectPreloadContext.Provider>;
}

export function useProjectPreloadUrl() {
  return useContext(ProjectPreloadContext);
}
