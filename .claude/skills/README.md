# Vendored skills

All seven third-party skill collections, copied in so they are available to any
session working in this repo. Skills placed here load automatically — there is
nothing to install.

**274 skills.** See "Context cost" below before adding more.

## Where these came from

All seven sources are MIT licensed. Copied at these commits:

| Source | Commit | Skills |
|--------|--------|--------|
| [MengTo/Skills](https://github.com/MengTo/Skills) | `321c769` | 132 — codex, game-development, media, ui, web-design |
| [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills) | `9a6930c` | 111 — ui-design, ux-strategy, design-systems, visual-critique, design-ops, design-research, interaction-design, prototyping-testing |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | `d23d7f8` | 12 — animate, apple-design, improve-animations, review-animations, prototype, pick-ui-library |
| [jakubkrehel/skills](https://github.com/jakubkrehel/skills) | `267330e` | 11 — better-typography, better-colors, better-layout, better-ui, interface-review |
| [ConardLi/garden-skills](https://github.com/ConardLi/garden-skills) | `aaf9a82` | 5 — web-design-engineer, beautiful-article, gpt-image-2, kb-retriever, web-video-presentation |
| [codeswithroh/tastemaker](https://github.com/codeswithroh/tastemaker) | `20c438e` | 2 — tastemaker, ideagram |
| [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) | `1c1e97c` | 1 — landing-page-design |

## What was changed on the way in

- **Binary demo media was dropped.** Images, video, GIFs, audio, PDFs and zips
  inside skill folders are not copied. Every markdown file, script and code
  sample is kept. This is what takes the install from 130 MB to 17 MB — 89 MB
  of it was demo screenshots and videos under `MengTo/Skills`.
  If a skill turns out to need one of its demo assets, fetch it from the source
  repo at the commit above.
- **`tastemaker/ideagram` was promoted** to a top-level skill. It shipped nested
  inside the `tastemaker` skill directory, where it would never have been
  registered.
- Two repos (`Owl-Listener/designer-skills`, `codeswithroh/tastemaker`) ship as
  plugin marketplaces. Their skills were lifted out of the plugin structure into
  flat directories here, which is what `.claude/skills/` expects.

## Context cost

Every skill's name and description is injected into the system prompt of every
session. At 274 skills that is roughly **21k tokens before anything is typed**,
and it makes skill triggering less precise, because the model is choosing from
274 similar-sounding design skills rather than a handful.

If sessions start feeling slow or the wrong skills keep firing, thin this
directory out — deleting a skill folder is the whole operation.

An alternative worth considering for the two marketplace repos is installing
them per-machine instead, where they apply to every project rather than only
this one, and can be toggled without a commit:

```
/plugin marketplace add Owl-Listener/designer-skills
/plugin marketplace add codeswithroh/tastemaker
```

## Updating

These are plain copies, not submodules. To refresh one, re-clone the source at
a newer commit, copy the skill directories over, drop the binary media, and
update the table above.

## A note on trust

A skill is a set of instructions Claude follows. These came from other people's
repositories, so treat them the way you would any dependency: read a skill
before relying on it for something that matters. Some ship helper scripts that
run locally when the skill is used — `beautiful-article/scripts/`,
`web-video-presentation/scripts/` and others under `MengTo/Skills`.
