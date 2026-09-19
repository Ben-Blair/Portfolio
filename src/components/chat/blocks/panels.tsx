import { PANEL_QUESTIONS } from "@/components/chat/questions";

import { AboutBlock } from "./AboutBlock";
import { ContactBlock } from "./ContactBlock";
import { FunBlock } from "./FunBlock";
import { ResumeBlock } from "./ResumeBlock";
import { SkillsBlock } from "./SkillsBlock";

/**
 * What each pill answers with. `?panel=<key>` on `/chat` looks itself up here.
 *
 * These are written, not generated: a pill is a question with one right answer, so it shouldn't
 * cost a model call or come back slightly different each time. Anything typed into the input
 * goes to the model instead.
 *
 * `question` is the pill's label expanded into something a person would actually type, because
 * that's what goes in the bubble at the top of the answer — "Me" reads like a button, and the
 * point of the panel is that it doesn't read like one. The blocks then play themselves out the
 * way a streamed answer does; see `src/components/chat/reveal.tsx`.
 *
 * Projects isn't here, and that's the point: a pill with no `panel` in `profile.pills` skips this
 * file completely and links straight to its `href`. Projects goes to `/projects?ask=1` and plays
 * the identical turn — question, thinking beat, answer — at the top of the page it's about, so
 * the answer can point down at the sections underneath it. See
 * `src/components/projects/ProjectsIntro.tsx`, which is where its question now lives.
 */
type PanelEntry = { question: string; Block: () => React.ReactNode };

export const PANELS: Record<string, PanelEntry> = {
  me: { question: PANEL_QUESTIONS.me, Block: AboutBlock },
  skills: { question: PANEL_QUESTIONS.skills, Block: SkillsBlock },
  fun: { question: PANEL_QUESTIONS.fun, Block: FunBlock },
  contact: { question: PANEL_QUESTIONS.contact, Block: ContactBlock },
  resume: { question: PANEL_QUESTIONS.resume, Block: ResumeBlock },
};
