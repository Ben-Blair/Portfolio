@AGENTS.md

# Attribution policy (non-negotiable)

This repository is authored by **Ben Blair** and must appear that way in public history.

When committing to this repo, you MUST NOT:

- Add `Co-Authored-By: Claude <noreply@anthropic.com>` or any other `Co-Authored-By` trailer
  naming an AI tool (Claude, Cursor, Copilot, Codex, ChatGPT, Devin, …).
- Add `🤖 Generated with [Claude Code](https://claude.com/claude-code)` or any equivalent
  "generated with" / "written by" footer to a commit message.
- Change `user.name` / `user.email` away from `Ben Blair <ben0r0blair@gmail.com>`.
- Credit an AI tool in `README.md`, `package.json`, source comments, or the site's own copy.

Commit messages describe the change and nothing else. Verify before pushing:

```bash
git log --format='%an <%ae>%n%B' | grep -iE 'claude|anthropic|cursor|copilot|codex|generated with|co-authored'
```

That command must print nothing.

# Project notes

- Content lives in `content/` as MDX + TS, outside `src/`. Adding a project means adding one
  `.mdx` file — never hardcode a project into a component or a page.
- `src/lib/schema.ts` is the contract for project frontmatter. Extend the Zod union there when
  adding a new media type, then add a matching case in `src/components/media/MediaBlock.tsx`.
- The hero background (`src/components/hero/FluidCanvas.tsx`) is a hand-written WebGL2
  Navier-Stokes sim. All tunables live in the exported `FLUID_CONFIG` — change numbers there
  rather than editing shader source.
