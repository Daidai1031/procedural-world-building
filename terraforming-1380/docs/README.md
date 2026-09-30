# Terraforming Contractor #1380 — Docs

Design and development documents for the game. They are meant to be **edited while the game is being built**, not written once and frozen.

## The documents

| File                           | Answers                                                                                       | Changes when…                                        | Change how often                     |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| [`design.md`](design.md)       | **Why and what it feels like.** Pillars, story, tone, metrics, endings, art direction.        | the vision changes                                   | rarely; always with a decision entry |
| [`spec.md`](spec.md)           | **What exactly the game must do.** Requirements with IDs, state, algorithms, controls, tests. | a rule is decided, or building teaches you something | often                                |
| [`content.md`](content.md)     | **What the player reads.** Notices, archives, audit and ending text, all classifications.     | you rewrite a line or add an outcome                 | often                                |
| [`tuning.md`](tuning.md)       | **Which numbers, and why.** Balance values, plus the playtest log.                            | after every playtest                                 | very often                           |
| [`roadmap.md`](roadmap.md)     | **What to build next.** Milestones as playable slices with checklists.                        | a task finishes or the plan shifts                   | weekly                               |
| [`decisions.md`](decisions.md) | **Why we chose that.** Decision log, open questions, rejected ideas.                          | any time design or spec changes                      | every change                         |
| [`archive/`](archive/)         | GDD v0.5, kept for reference.                                                                 | never                                                | –                                    |

A rule of thumb: **design.md is the reason, spec.md is the rule, tuning.md is the number, content.md is the words.** If you are unsure where something goes, ask which of those it is.

## Working agreement: changing the design while building

1. **Notice.** A playtest, a technical wall, or a new idea suggests a change.
2. **Log it.** Add a `D-` entry to [`decisions.md`](decisions.md) (context, decision, why, what it affects). For a value change only, a line in the [playtest log](tuning.md#playtest-log) is enough.
3. **Update the docs.** Edit `design.md` if the vision changed, `spec.md` if a rule changed, `content.md` for wording, `tuning.md` for numbers. Put the `D-` number in the change log at the bottom of the file.
4. **Update the code and the roadmap** in the same commit or PR. Commit messages can start with the IDs they touch, for example `TERR-03: add chunk border`.
5. **If code and docs disagree, one is wrong.** Fix it the same day.

### Conventions

- **Requirement IDs** (`TERR-03`, `CLS-07`, …) are permanent. Do not renumber. Cut a requirement by marking it `cut`, not by deleting it.
- **`TUNE`** in the spec marks a number that lives in `tuning.md` and `src/config/tuning.ts`.
- **`(open)` and `OQ-xx`** mark an undecided point. Each open question has a suggested default in `decisions.md` so work never waits.
- **Status values** in the spec: `todo` · `wip` · `done` · `cut` · `?`.
- **Naming.** One canonical English name per concept (Capital, Biosphere, Development Readiness, Stability, Historical Significance, Planet Remaining, Cosmic Exposure, Planetary Memory, Terrain Tool, Terrain Canister, Deep Echo). Use the same word in docs, code, and UI.

## Suggested first steps

1. Read [`design.md`](design.md) §1–§2 to re-anchor on the pitch.
2. Answer the open questions in [`decisions.md`](decisions.md) or accept their defaults (OQ-01 and OQ-06 matter most).
3. Start [`roadmap.md`](roadmap.md) at M0.

## Where this sits in the repo

```text
procedural-world-building/
├── worldbuilding-guidebook/
└── terraforming-1380/
    ├── docs/            ← you are here
    ├── src/
    └── README.md        (how to run the game)
```
