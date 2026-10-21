# Procedural World Building Learning Site

Interactive course website built with React, Vite, React Three Fiber, and Drei.

## Workflow: how each lesson is made

Every lesson follows the same loop, from class to review:

1. **Class notes.** Start from the lecture notes and slides.
2. **Clarify in a chat session.** Anything not understood goes to an LLM in one chat session until the idea is clear.
3. **Exercise document.** From the assignment, the LLM drafts the write-up in [`docs/exercise/`](../docs/exercise/README.md), keeping plans separate from observed results.
4. **A plan of about 10 steps.** The LLM proposes the lesson as roughly ten steps, each stating one conclusion.
5. **Build one step at a time.** Each step is built and checked before the next begins.
6. **One parameter per visual.** The canvas on the right shows a single parameter at a time, with a legend, instead of one lab exposing every control at once. Combined labs (such as the composite shader lab) come after the individual parameters are understood.
7. **Read the code, don't write it.** Real source is shown in the step and explained line by line. The goal is to read and follow the code, not to author it.
8. **A short practice question.** Each step ends with a small variation on what was just shown (a "same idea, new case" question) for review.

## Run the website

Open PowerShell in this folder:

```powershell
cd "E:\Cornell\26fall\procedural world building\dd699\worldbuilding-guidebook"
```

Install dependencies once after cloning the repository or when `node_modules` is missing:

```powershell
npm.cmd install
```

Start the local development server:

```powershell
npm.cmd run dev
```

Vite will print a local address, usually `http://localhost:5173/`. The app is served under `/guidebook/`, so open `http://localhost:5173/guidebook/` (the bare address only shows a "did you mean" link). While the server is running, saved changes update the page automatically.

To jump straight to a step, use `http://localhost:5173/guidebook/lesson/<lesson-slug>/<step-slug>`. For example, Lesson 05 Step 01 is `http://localhost:5173/guidebook/lesson/distributions/from-one-asset-to-many`, and Step 02 is `.../distributions/randomness-and-seeds`. The step slug is the file name in `content/lessons/<lesson>/steps/` without the number prefix and `.mdx`.

Press `Ctrl+C` in the PowerShell window to stop the server.

> In some PowerShell setups, `npm` is blocked because it tries to run `npm.ps1`. Use `npm.cmd` as shown above; it runs the same npm commands without that PowerShell policy issue.

## Check and build

Run the linter:

```powershell
npm.cmd run lint
```

Create a production build:

```powershell
npm.cmd run build
```

Preview the production build locally:

```powershell
npm.cmd run preview
```

## Lessons

The site currently includes six complete interactive lessons: Lesson 01 — Scene Basics (Three.js with React), Lesson 02 — Terrain (Noise & Erosion), Lesson 03 — Voxels, Lesson 04 — Shader, Lesson 05 — Distributions (Scattering & Populations), and Lesson 06 — Paths (Splines & Terrain). Lesson 02 is divided into 2.1 Noise Generation and 2.2 Erosion Simulation. Use the lesson navigation at the top of the page to switch lessons without reloading.

Lesson 05 has eight interactive steps with real source excerpts and practice. It progresses from seeded candidates and noise masks to terrain-map rules, surface orientation, slope filtering, independent tree/rock/farmland/antenna layers, and an anchored base with an exclusion zone. The final population is repeatable, reports accepted counts, supports terrain-driven variation, and enforces minimum antenna spacing. Its implementation record is [`docs/exercise/07-scattering-system.md`](../docs/exercise/07-scattering-system.md).

Lesson 06 has six interactive steps inspired by Contract #1380: waypoint order, smooth turns, distance-based movement, terrain projection, body clearance and reachable-shelter selection. Every step has a real source excerpt and fill practice. Playback starts paused and supports stepping; blocked routes stop safely, and both-blocked candidates leave the resident waiting. Inspect includes a local terrain cut/fill experiment and repeatable route seeds. This is a teaching demo, not game migration code. See [`docs/exercise/08-spline-layer.md`](../docs/exercise/08-spline-layer.md). Start at `/guidebook/lesson/paths/points-become-paths`.

Lesson 07 — Particles (Dust, Wind & Motion) has plain-language text, an interactive scene, panel controls and a fill practice for all eight steps. Its plan is [`docs/exercise/09-particle-system.md`](../docs/exercise/09-particle-system.md).

Lesson 08 — Branching Systems (从一条线，长出一个世界) is **content and planning only**. Eight beginner-facing steps use Chinese explanations with English terms: drawing instructions, L-system rewriting, bracket branches, branch-depth shape, seeded alien assets, growth animation, asset LOD, and a controlled robot-disturbance/resident-response comparison. Its scenes, controls and graded practice are not implemented. The canvas design, scope boundaries, acceptance criteria and optional Microscope reflection are in [`docs/exercise/10-branching-systems.md`](../docs/exercise/10-branching-systems.md). Game applications are design directions, not new Terraforming Contractor features.
