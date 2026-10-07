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

Vite will print a local address, usually `http://localhost:5173/`. Open that address in a browser. While the server is running, saved changes update the page automatically.

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

The site currently includes Lesson 01 — Scene Basics (Three.js with React) and Lesson 02 — Terrain (Noise & Erosion). Lesson 02 is divided into 2.1 Noise Generation and 2.2 Erosion Simulation. Use the lesson navigation at the top of the page to switch lessons without reloading.
