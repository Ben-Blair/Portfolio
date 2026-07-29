import { AboutBlock } from "./AboutBlock";
import { ContactBlock } from "./ContactBlock";
import { FunBlock } from "./FunBlock";
import { SkillsBlock } from "./SkillsBlock";

/**
 * What each pill answers with. `?panel=<key>` on `/chat` looks itself up here.
 *
 * These are written, not generated: a pill is a question with one right answer, so it shouldn't
 * cost a model call or come back slightly different each time. Anything typed into the input
 * goes to the model instead.
 *
 * Not every pill needs an entry. Projects deliberately has none — `/projects` is already built to
 * be browsed, and a panel in front of it was just a click on the way. A pill with no `panel` in
 * `profile.pills` links straight to its page.
 */
export const PANELS: Record<string, { title: string; Block: () => React.ReactNode }> = {
  me: { title: "About me", Block: AboutBlock },
  skills: { title: "My Skills", Block: SkillsBlock },
  fun: { title: "Fun", Block: FunBlock },
  contact: { title: "Get in touch", Block: ContactBlock },
};
