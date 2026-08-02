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

/** The panel key a typed question maps to, or `null` if none matches and it should go to the model. */
export function matchPanel(question: string): string | null {
  const text = question.trim().toLowerCase();
  if (!text) return null;
  for (const [key, patterns] of Object.entries(PANEL_INTENTS)) {
    if (patterns.some((pattern) => pattern.test(text))) return key;
  }
  return null;
}
