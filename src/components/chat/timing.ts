/**
 * The two beats a written answer takes before it starts arriving.
 *
 * They live here rather than in `ChatView` because `/projects` plays the same turn at the top of
 * its own page — the question, the wait, then the answer — and the two have to agree. A visitor
 * clicking Projects and a visitor clicking Skills should be waiting exactly as long.
 */

/**
 * How long a panel sits on the typing dots before it starts answering.
 *
 * A written answer is ready the instant you click, and showing it that way makes the pill feel
 * like a link again — the bubble would be on screen for a single frame. The pause is the model
 * thinking, except there's no model: it costs nothing and it's what makes the turn read as a
 * reply. Roughly the time to the model's first token on a real question.
 */
export const PANEL_THINKING_MS = 250;

/**
 * How long the question and the dots take to clear out before the answer starts arriving.
 *
 * They used to leave on the same frame the answer landed, which meant the two motions were
 * happening on top of each other and neither read as causing the other. Given a beat to itself,
 * the turn has three parts you can actually follow: asked, thought about, answered.
 *
 * Matched by hand in `QuestionBubble`'s `lift` mode and `TypingDots` — CSS transitions can't read
 * a constant, and a style prop for two numbers that never change independently isn't worth it.
 */
export const PANEL_EXIT_MS = 220;
