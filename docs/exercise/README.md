# Hands-on Exercise Notes

This directory records knowledge gained **after implementing and testing code** in this repository.

It is intentionally separate from [`../tutorials/`](../tutorials/):

- **Tutorials** are preparation: concepts, terminology, API overviews, and material to study before coding.
- **Exercises** are field notes: what was actually built, which source files produced it, important implementation decisions, observed behavior, problems, and useful next experiments.

## Exercise index

| Exercise | Project | Source files | Key practical lessons |
| --- | --- | --- | --- |
| [01 — React Three Fiber baseline scene](./01-r3f-baseline-scene.md) | [`my-first-react`](../../my-first-react/) | [`App.jsx`](../../my-first-react/src/App.jsx), [`main.jsx`](../../my-first-react/src/main.jsx), [`index.css`](../../my-first-react/src/index.css), [`package.json`](../../my-first-react/package.json) | React Three Fiber scene composition; geometry/material comparison; a three-light rig; the complete shadow setup chain; perspective-camera and orbit-control configuration |
| [02 — Scene learning UI](./02-scene-learning-ui.md) | [`my-first-react`](../../my-first-react/) | [`App.jsx`](../../my-first-react/src/App.jsx), [`App.css`](../../my-first-react/src/App.css) | DOM overlay on a WebGL canvas; reusable information groups; data-driven entity cards; shared React state connecting UI selection to 3D objects; responsive panel layout |

## What every exercise note should contain

1. The exercise goal and the result that was actually produced.
2. Links to the original project and relevant source files.
3. The exact components and important parameters used.
4. Practical observations, including unexpected behavior and mistakes.
5. A small list of follow-up experiments that can be performed on the same code.

## Adding the next exercise

Create a numbered file such as `02-environment-map.md`, then add one row to the index above. Record the state of the code at the time of the exercise; do not turn the exercise note into a general API tutorial.


### Entry template

```markdown
# Exercise XX — Title

**Date:** YYYY-MM-DD
**Project:** project name and relative link
**Main implementation:** source-file name and relative link
**Status:** Planned / In progress / Complete

## Exercise goal
## Source files
## What the exercise produced
## Exact changes and parameters
## Observed behavior
## Problems and fixes
## Practical takeaways
## Follow-up experiments
```
