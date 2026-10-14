<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

- Read `ROADMAP.md` before starting work: it tracks phase progress, decisions and known issues. Update it at the end of each phase.
- UI has 4 languages (uk default, en, de, ru). Strings live in `src/lib/i18n/dictionaries/`; add every new key to all four. Server: `getDictionary()`, client: `useI18n()`.
- Money: compute in integer cents only.
