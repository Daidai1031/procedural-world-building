# Exercise 08: Paths for Contract #1380

Updated: 2026-10-21

Status: All six guidebook scenes, controls, source excerpts and fill practices implemented. This does not implement resident migration in the game.

## Why this lesson exists

Help one resident travel from a cave entrance to a reachable shelter. The lesson connects curve geometry to a visible decision in Terraforming Contractor #1380.

The game currently has robot travel and progressive mining. Residents and migration are planned. This lesson is a teaching demo, not a change to the game's approved movement algorithm.

Sources:
- [Game design](../../terraforming-1380/docs/design.md), sections 7.3 and 10.3: robots move through empty space; mining opens solid ground progressively.
- [Procedural system](../../terraforming-1380/docs/procedural-system.md), sections 4–5: clearance, quiet shelters, and visible waiting when no route exists.
- [Game requirements](../../terraforming-1380/docs/spec.md): AUT-04/05/07, HAB-03, RES-02/04/06/07. Residents cannot dig themselves a route or teleport through rock.

## Useful knowledge and skills

| Game situation | Knowledge | Skill to practise |
| --- | --- | --- |
| Travel between a cave and a shelter | Ordered waypoints | Read and change a route's point list |
| Turn around an obstacle | Spline shape and tangent | Adjust a bend; inspect whether smoothing cuts a corner |
| Move steadily | Arc length and simulation time | Advance by distance, orient toward the tangent |
| Follow uneven ground | Surface queries and local up | Project route samples onto the correct surface |
| A body must fit through a passage | Clearance over the whole movement segment | Reject an unsafe route before moving |
| Dig/Add changes a route | Terrain revision and revalidation | Stop, recheck, then choose another valid route |
| Choose a quieter destination | Hard constraints versus preferences | Reject blocked routes before comparing costs |

Later extensions: full 3D cave search, habitat detection, occupancy reservations, cooldowns, spherical movement and local steering. This lesson does not settle those game systems. Vector fields belong in Lesson 07; they do not replace clearance checks.

## Teaching rules

Each step has one conclusion, one short action and one visible result. Keep English body text around 60–100 words, excluding the implementation-status note. Explain source line by line in the code view, not in long prose.

Keep the same resident, cave entrance, rock and destination markers across steps. Use a simple proxy resident; its shape is not the final game character design. Begin on flat ground, introduce a height field in Step 04, then use a small passage fixture in Step 05.

The Canvas is the evidence. Controls affect the exact object named in the text. Keep at most two main teaching controls visible. Put diagnostics in a collapsed "Inspect" section. Step 06 may combine earlier ideas, but should not expose every previous slider.

Reuse the existing viewport toolbar separately from lesson controls. Give markers names and shapes, not colour alone. Blocked sections have red crosses plus a short reason; selected routes have solid lines and alternatives have dashed lines.

Keep status text in its own row beside the lesson controls and away from Previous/Next. Keyboard and pointer navigation must remain usable. Playback has Play/Pause and Restart; all playback starts paused and offers Step forward.

## Six steps

Existing file names and route slugs stay stable. Titles change where the new learning goal is clearer.

| Step | Short title | Main panel | Canvas response | One readout |
| --- | --- | --- | --- | --- |
| 01 | Points become paths | Waypoint order | Numbered nodes and arrows reconnect | Start → waypoint → end |
| 02 | Make a smooth turn | Straight / Curve; Bend offset | Same points, different bend around a rock | Clear / Touches rock |
| 03 | Move by distance | Parameter / Distance; Play/Pause | A resident moves; dots mark equal time intervals | Distance travelled this tick |
| 04 | Follow the ground | Sample spacing; Map / Ground | Source route and projected segments; bad sections marked | Worst measured penetration |
| 05 | Can the resident pass? | Body radius; Passage state | Body envelope and blocked segment respond to terrain edits | Passable / Passage too narrow |
| 06 | Choose a reachable shelter | Disturbance; Passage state | Two routes are checked, compared, selected or rejected | Route A / Route B / Waiting |

### 01: Points become paths

Use entrance A, rock-side waypoint B, shelter C. Toggle A → B → C and A → C → B. Point positions stay fixed; order and final destination change. Do not animate travel before explaining that these are proposed connections.

Source focus: the ordered point list and segment construction.

Practice: complete the waypoint list for "pass B before reaching C".

Check: node positions are unchanged; segment order matches the chosen list.

### 02: Make a smooth turn

Keep endpoints fixed and move only the middle bend point with one offset slider. Compare a polyline and a fixed Catmull–Rom interpolation mode. Keep the control polygon visible. If the curve touches the obstacle, highlight the unsafe section.

Source focus: control points and curve construction.

Practice: predict which section changes when the middle point moves; implement as a short fill using a separate real-source fragment.

Check: both routes retain their endpoints; the reference safe/unsafe offsets give different collision outcomes. Evaluate the curved route, not only the control polygon.

### 03: Move by distance

Use a safe flat route with unevenly spaced control points. Fix speed; change only the sampling method. Advance on simulation time, not render frame count. Equal-time dots show the difference immediately. The tangent controls heading.

Source focus: distance travelled = speed × timestep, followed by distance-to-curve lookup.

Practice: choose distance-based sampling for steady motion.

Check: equal elapsed time gives comparable travelled distance at different render rates. Endpoint handling stops cleanly. Measure arc distance, since straight chords can differ around bends.

### 04: Follow the ground

Reuse Lesson 05's height field. In map mode draw the route on a visible reference plane above the highest hill; show vertical guides down to ground samples. Ground mode shows the projected polyline. Keep the display offset fixed so the learner cannot hide bad sampling by raising the route.

Source focus: y = heightAt(x, z) + displayOffset.

Practice: fill the terrain-height expression.

Check: each sample matches the query; densely inspect between samples and report the worst measured penetration. A midpoint-only check can miss a narrow bump. Sampling is an approximation, not a collision guarantee.

Game transfer note: the planet has caves and multiple surfaces. Surface queries need a chosen origin, direction and intended surface. Outermost radial hits suit exterior hover movement but cannot find an interior cave floor.

### 05: Can the resident pass?

Use one fixed corridor between rocks. Body radius shows why an empty centreline may still be unsafe. "Passage state" has Original, Block passage, Open passage. Each selection rebuilds from the same baseline rather than accumulating edits.

The open/block actions represent player or Builder intervention. The resident never excavates. After an edit, pause movement, validate the body along each segment, and resume only if safe. Check support separately from empty space for a ground-moving resident.

Add a collapsed "Terrain effect" experiment to retain the course's spline-to-mesh requirement. Display a centreline band; "Corridor width" changes a local cut/fill profile and shoulder falloff. Show Before / After on a copied height field. Revalidate the route after rebuilding it. This is a lesson-only terrain operation, not a new game tool.

Source focus: body clearance and distance-to-centreline influence.

Practice: complete the distance falloff for the optional terrain-influence experiment. The main source excerpt shows body clearance and support checks.

Check: safe/blocked/narrow fixtures, body envelope along segments, edits outside the influence band unchanged, and invalidation before any next move. Document the collision approximation used.

### 06: Choose a reachable shelter

Use two authored valid shelter candidates. Generate a bounded set of seeded bends to each. First reject blocked, unsupported or too-steep routes. Then compare valid routes using displayed distance and accumulated disturbance. Normalize units before combining costs; keep the teaching weights fixed and label them as demo values.

"Disturbance" affects one marked work site. "Passage state" has Open, A blocked, Both blocked. Route cards list validity and the two measurements. If none pass, show "Waiting: no clear route" and leave the resident visible at a safe position.

Freeze the scenario while comparing. Settings changes pause and reset the resident at the entrance, rebuild candidates, and validate before playback can continue. No dynamic per-frame replanning is used. A future continuously changing world would need a decision interval and improvement threshold; exact game cooldowns remain undecided.

Put Seed, New candidates and Restore example in "Inspect". Same seed/settings reproduce candidates and stable tie-breaking. Changing seed may produce no route. Say "No route found in these attempts"; bounded search does not prove that no possible route exists.

Source focus: generate → project → validate → rank → move; terrain edits return to validate.

Practice: fill the validity filter that runs before ranking.

Assignment: show a generated route, 2D-to-3D projection, a local terrain edit, and a clear reason for selection or waiting. Record the seed and settings. Evaluate this assignment manually; do not claim a fill question grades the full system.

Check: repeatability, invalid routes excluded even when cheap, both-blocked waiting, bounded attempts, stable ties, edit-triggered revalidation and no motion through solid ground.

## Implementation boundaries

Reuse the single Canvas, lesson loader, comparison controls, legends and source extractor. Reuse the Lesson 05 seeded generator and terrain query. Prefix new parameters with path.

Implementation files:
- src/scene/demos/paths/pathMath.js: curves, sampling, projection and route comparison.
- src/scene/demos/paths/pathClearance.js: passage checks and terrain-edit invalidation.
- src/scene/demos/paths/params.js: only the controls used by these steps.
- src/scene/demos/paths/PathDemo.jsx: route, body, terrain and diagnostic drawing.
- scripts/paths.test.mjs: meaningful geometric and decision checks.

Use existing fill practice for short checks. Do not generalize the noise-only match scorer for this lesson. Source excerpts must come from the implementation once built. No scene or practice frontmatter is added until the corresponding code exists.

## Acceptance and status

All six steps are implemented. Browser coverage walks the six scenes with real pointer navigation, answers their practices, preserves the single Canvas, and checks playback, clearance, terrain projection, route choice and narrow-screen keyboard use.

The final review must show:
- A learner can name the effect of every visible teaching control.
- Text, control labels and Canvas markers use the same names.
- Each step changes only its introduced concept; scene state resets deliberately where needed.
- A blocked route stays blocked after smoothing and after terrain edits.
- The resident remains visible when it cannot move.
- Previous/Next and live status remain unobscured by panels.
- Source, short practice and scene demonstrate the same rule.
- Game features still planned are never labelled implemented.

### Implementation details and limits

- `PathPanel.jsx` keeps the teaching controls, live result and candidate cards together. View controls and the terrain experiment live under Inspect. The desktop Canvas uses the space beside the lesson card; narrow screens use a scrollable layout.
- `pathMath.js` uses centripetal Catmull-Rom curves and a 1,200-division arc-length table. Playback advances in 0.1-second ticks and stops at the endpoint. Hidden tabs pause playback.
- Clearance is an exact swept-disc versus vertical-cylinder test for each polyline segment. Terrain support is sampled at intervals no greater than 0.02 m; penetration checks use 0.015 m. These sampled ground checks are not a general collision guarantee or a cave solver.
- The optional edit copies the Lesson 05 mesh, blends the centreline toward an endpoint grade and fades the edit to zero outside Corridor width. It reprojects and revalidates after each change; the source terrain stays unchanged.
- Step 06 projects six seeded curves onto a gentle teaching surface. Invalid routes are excluded before comparing `length / 8 + integrated disturbance / 2`. Ties use candidate IDs. Both blocked leaves the resident waiting at the entrance.
- Arches are authored entrance/shelter markers. Crosses are visible through obstacles as diagnostic overlays. No cave detection, digging actor or game migration system was added.

Verification commands (run inside `worldbuilding-guidebook`):

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:browser -- tests/lesson06.spec.js
```

Geometry and decision coverage: `scripts/paths.test.mjs`. Browser screenshots: `artifacts/lesson06/`.
