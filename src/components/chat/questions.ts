/**
 * The wording that goes in the question bubble for a pill click.
 *
 * Its own module so the turn overlay — mounted on every page, including the hero — can paint a
 * bubble without importing `panels.tsx`, which would drag every panel block into the landing
 * bundle. `panels.tsx` reads from here rather than the other way around.
 */
export const PANEL_QUESTIONS = {
  me: "Who are you? I want to know more about you.",
  skills: "What are you good at?",
  fun: "What do you do for fun?",
  contact: "How do I get in touch?",
  resume: "Can I see your resume?",
} as const;

export type PanelKey = keyof typeof PANEL_QUESTIONS;

/** The Projects pill's label, expanded into something a person would actually type. */
export const PROJECTS_QUESTION = "What have you built?";
