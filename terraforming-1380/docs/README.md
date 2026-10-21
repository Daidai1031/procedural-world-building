# Terraforming Contractor #1380 — Docs

The project is a **procedural sandbox where players freely reshape different planets**.

**Starting conditions → player choices and robot work → environmental change → resident responses → different planetary outcomes.**

## Start here

1. [design.md](design.md): the player's freedom, experience and design intent.
2. [procedural-system.md](procedural-system.md): how the causal chain works, including the first cave-dwelling species and persistent planets.
3. [roadmap.md](roadmap.md): what to implement next, starting with one resident response.
4. [spec.md](spec.md): exact requirements and future acceptance checks.

**Current implementation:** terrain tools, Miner/Gardener/Builder, plant/antenna behavior, operations, surface exploration/atlas and reset-style travel.

**Planned:** responsive residents, retained worlds across travel, independently varied playable planet sizes/resources and a live 3D overview. Documentation changes do not implement these.

## The documents

| File | Responsibility |
| --- | --- |
| [design.md](design.md) | Why the game exists, player experience and design pillars |
| [procedural-system.md](procedural-system.md) | Readable causal explanation; rules link to spec rather than duplicate exact schemas |
| [spec.md](spec.md) | Stable requirement IDs, current/planned state, algorithms and acceptance |
| [content.md](content.md) | Draft player-facing copy, labels and tone; distinguish drafts from installed strings |
| [tuning.md](tuning.md) | Current runtime values, planned parameter responsibilities and actual playtest evidence |
| [roadmap.md](roadmap.md) | Active playable slices, then retained development history |
| [decisions.md](decisions.md) | Accepted/proposed decisions and their reasons |
| [reviews/2026-10-20-crit.md](reviews/2026-10-20-crit.md) | Paraphrased crit themes, subsequent decisions and evidence to collect |
| [component-board.html](component-board.html) | Existing D-027 visual comparison board; resident body still undecided |
| [archive/](archive/) | Historical GDD; not the active backlog |

Design explains the intent; procedural-system connects effects; spec defines checkable rules; tuning holds numbers; content holds words.

## Updating these documents

- Record design changes with a new D-number; preserve old decision text and explicitly describe supersession.
- Distinguish **accepted**, **proposed**, **implemented**, and **verified in play**. They are different statuses.
- Keep requirement IDs stable. Preserve historic completion records; do not mark future resident/planet work done because it is documented.
- Documentation-only changes may record future design while explicitly stating that runtime is unchanged. Mark any implementation gap. Update code and matching status when that feature is built.
- Actual runtime types and values live in src/state/runState.ts and src/config/tuning.ts. Spec/tuning snapshots describe the checked version; future schemas/values must be marked planned.
- D-034–037 define the accepted sandbox direction. D-038 antenna separation is proposed only.
- Detailed accounting can stay internal, but existing critical restrictions must remain understandable. No bankruptcy redesign is approved by D-037.
- Historical narrative scope remains available; its old MVP labels are not the active task order.

## Next implementation

S1 in [roadmap.md](roadmap.md): one species, valid snug cavities, local work disturbance, peeking/retreat and return after quiet. Use HAB-01–04 / RES-01–03/08 and their acceptance checks. Relocation follows in S2; persistent travel in S3; the overview in S4.

## Location

All game design/development docs stay in terraforming-1380/docs/. Course assignments remain under the repository's docs/exercise/; lesson content remains under worldbuilding-guidebook/. No lesson or exercise content was changed in this update.
