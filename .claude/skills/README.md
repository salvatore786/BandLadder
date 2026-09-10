# Vendored skills

Third-party Claude Code skills, copied in so they are available to any session
working in this repo. Skills placed here load automatically — there is nothing
to install.

## Where these came from

All four sources are MIT licensed. Copied at these commits:

| Source | Commit | Skills |
|--------|--------|--------|
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | `d23d7f8` | animate, animate-expo, animation-vocabulary, apple-design, ask-sonner, emil-design-eng, find-animation-opportunities, improve-animations, pick-ui-library, prototype, review-animations, write-swift |
| [jakubkrehel/skills](https://github.com/jakubkrehel/skills) | `267330e` | better-accessibility, better-colors, better-interface, better-layout, better-typography, better-ui, better-writing, break, explain-interface, interface-review, variant |
| [ConardLi/garden-skills](https://github.com/ConardLi/garden-skills) | `aaf9a82` | beautiful-article, gpt-image-2, kb-retriever, web-design-engineer, web-video-presentation |
| [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) | `1c1e97c` | landing-page-design |

## What was deliberately left out

Two much larger collections were considered and skipped:

- **MengTo/Skills** — 132 skills, 100 MB, mostly screenshots and demos.
- **Owl-Listener/designer-skills** — 111 skills across 10 plugins.

Together with the four above that would be 274 skills. Every skill's name and
description is injected into the system prompt of every session, so all 274
would cost roughly 19k tokens before a word is typed, and would make skill
triggering less accurate for the ones actually in use. The 29 here cost about
2k tokens.

Both of those repos, plus [codeswithroh/tastemaker](https://github.com/codeswithroh/tastemaker),
ship as plugin marketplaces and are better added per-machine, where they are
available in every project rather than only this one:

```
/plugin marketplace add Owl-Listener/designer-skills
/plugin marketplace add codeswithroh/tastemaker
```

## Updating

These are plain copies, not submodules. To refresh one, re-clone the source at
a newer commit, copy the skill directories over, and update the table above.

## A note on trust

A skill is a set of instructions Claude follows. These came from other people's
repositories, so treat them the way you would any dependency: read a skill
before relying on it for something that matters. Four of them ship helper
scripts (`beautiful-article/scripts/`, `web-video-presentation/scripts/`) that
run locally when those skills are used.
