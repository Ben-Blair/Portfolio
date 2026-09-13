/**
 * Free-text phrasings that mean the same thing as clicking a pill. Checked before a question goes
 * to the model — matching one is answered by the pill's own written panel instead of a Gemini
 * call, for the same "written, not generated" reason `panels.tsx` gives for pill clicks: a
 * question with one right answer shouldn't cost a model call or come back slightly different
 * each time.
 *
 * No React in this file, unlike `panels.tsx` — `href.ts` needs it from the landing page, and
 * pulling the panel Blocks in there would pull the AI SDK's bundle weight along with them.
 */
const PANEL_INTENTS: Record<string, RegExp[]> = {
  /**
   * The odd one out: `projects` is not a panel. It has no entry in `panels.tsx` and no `panel` in
   * `profile.pills`, because its answer is the project list itself — so matching it sends you to
   * `/projects?ask=1`, which plays the same turn at the top of the page it's about. `href.ts` is
   * where that fork lives.
   *
   * Every pattern here is anchored on a whole phrase rather than on a keyword, and "built" is the
   * reason. The hero's own suggested prompt is "What's the coolest thing you've built?"
   * (`content/profile.ts`), which wants a written answer with a picture in it — a bare /\bbuilt\b/
   * would hijack it into a page navigation and quietly delete one of the four questions the landing
   * page invites. `what have you built` matches; `the coolest thing you've built` does not.
   */
  projects: [
    /\bwhat have you (built|done|made|worked on|shipped)\b/,
    /\byour (portfolio|projects)\b/,
    /\bshow me (your |the )?(portfolio|projects|work)\b/,
    /\b(see|view) your (projects|work|portfolio)\b/,
  ],
  me: [
    /\bwho are you\b/,
    /\babout (yourself|you)\b/,
    /\btell me (about|more about) (yourself|you)\b/,
    /\bwhat should i know about you\b/,
    /\bintroduce yourself\b/,
  ],
  skills: [
    /\bwhat are you good at\b/,
    /\byour skills\b/,
    /\bwhat can you do\b/,
    /\bwhat do you (know|specialize in)\b/,
    /\byour strengths\b/,
    /\btech(nical)? stack\b/,
  ],
  fun: [
    /\bfor fun\b/,
    /\byour hobbies\b/,
    /\boutside of work\b/,
    /\bin your free time\b/,
    /\bdo for fun\b/,
  ],
  contact: [
    /\bget in touch\b/,
    /\bcontact you\b/,
    /\breach you\b/,
    /\bhow (do|can) i (contact|reach) you\b/,
    /\byour email\b/,
  ],
  resume: [
    /\b(your |the )?resume\b/,
    /\b(your |the )?cv\b/,
    /\bsee your (resume|cv)\b/,
  ],
};

/**
 * Every destination a question can be routed to, panels plus `projects`. Exported for the classifier
 * in `lib/ai.ts`, which offers the model exactly this list as an enum so it can't answer with a
 * destination that doesn't exist.
 */
export const PANEL_KEYS = Object.keys(PANEL_INTENTS);

/** The panel key a typed question maps to, or `null` if none matches and it should go to the model. */
export function matchPanel(question: string): string | null {
  const text = question.trim().toLowerCase();
  if (!text) return null;
  for (const [key, patterns] of Object.entries(PANEL_INTENTS)) {
    if (patterns.some((pattern) => pattern.test(text))) return key;
  }
  return null;
}
