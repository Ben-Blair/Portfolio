import { generateObject } from "ai";

import { PANEL_KEYS } from "@/components/chat/panelIntent";
import { NO_ROUTE, buildRouterPrompt, isChatConfigured, routerModel } from "@/lib/ai";
import { clientIp, rateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_CHARS = 300;

/**
 * Does this question want a page instead of an answer?
 *
 * The second half of the routing in `panelIntent.ts`. That file's patterns catch the obvious
 * phrasings for free and instantly, which is why they're still the first thing tried; this is for
 * everything they miss — "got anything I can look at?" means the projects page and matches no
 * pattern anyone would think to write.
 *
 * Deliberately a separate endpoint rather than a tool on `/api/chat`. As a tool the decision would
 * arrive with the first token of the answer, behind the full system prompt's prefill, which
 * `lib/ai.ts` measures at 9.7–28.9 seconds — far too late to be a redirect and long past the point
 * where the visitor would rather just have the answer. On its own with a tiny prompt it comes back in
 * a fraction of that, and it can't disturb the stream it's racing.
 *
 * Answers `{ panel: null }` for every failure rather than an error status. The caller is a
 * best-effort redirect running alongside an answer that is already on its way: there is nothing for
 * it to do with a 500 except carry on, so saying "no page" is both true and the whole story.
 */
export async function POST(req: Request) {
  // No key configured means no router. The regex still works, so routing degrades rather than breaks
  // — see the offline state in `components/hero/ChatDock.tsx`.
  if (!isChatConfigured()) return Response.json({ panel: null });

  // Shares one budget with `/api/chat` rather than having its own; see `lib/rateLimit.ts`.
  if (rateLimited(clientIp(req))) return Response.json({ panel: null });

  let question: unknown;
  try {
    ({ question } = (await req.json()) as { question?: unknown });
  } catch {
    return Response.json({ panel: null });
  }

  // Longer than this is prose, not a question asking to be shown a page, and it isn't worth sending
  // to the model to find that out.
  if (typeof question !== "string" || !question.trim() || question.length > MAX_CHARS) {
    return Response.json({ panel: null });
  }

  try {
    // `output: "enum"` rather than a free-text answer or a schema with a string field: the model is
    // constrained to one of these exact values, so there's no parsing to do and no way for it to
    // invent a destination that doesn't exist. `PANEL_KEYS` comes from the intent table itself, so
    // adding a pill can't leave the router offering a stale list.
    const { object } = await generateObject({
      model: routerModel(),
      output: "enum",
      enum: [...PANEL_KEYS, NO_ROUTE],
      prompt: buildRouterPrompt(question.trim(), PANEL_KEYS),
    });

    return Response.json({ panel: object === NO_ROUTE ? null : object });
  } catch (error) {
    console.error("[route-intent] classify failed:", error);
    return Response.json({ panel: null });
  }
}
