# Seedling — roadmap

Six phases. Each has a prompt in `prompts/`. Do not start a phase until the previous
one meets its acceptance criteria — every phase is load-bearing for the next.

Phase 1 is the only one that cannot be reordered or skipped. Everything else depends on
the content model existing.

---

## Phase 1 — Skeleton and Lesson 01

Build the content model, routing, the single canvas, and the step card. Migrate Lesson
01 (`SceneAnatomyLesson.jsx`) into 8–10 steps as the reference implementation.

**Explicitly not in this phase:** visual design. Use plain, unstyled-looking markup.
The point is to prove the model works before spending effort on how it looks.

Accept when:

- [ ] `/lesson/scene-anatomy/<slug>` renders a step from an `.mdx` file
- [ ] Prev/Next walk all steps in order; URLs are shareable and reload correctly
- [ ] Exactly one `<Canvas>` exists in `src/`; stepping does not remount it
- [ ] Orbit the camera, press Next five times — the camera has not moved
- [ ] `scene.unlock` shows and hides controls; values persist across steps
- [ ] Lesson 01 is 8–10 steps and `SceneAnatomyLesson.jsx` is deleted
- [ ] Lesson 02 still loads through the legacy path, untouched
- [ ] `npm run lint` and `npm run build` pass

## Phase 2 — Design system

Apply `design.md`. Tokens, type, the N3 layout, card collapse and resize, the inset,
the control strip, the outline rail, step transitions.

Accept when:

- [ ] Every colour, size, and radius in `src/` comes from a token
- [ ] Card drags 360–760px and collapses with `⌘\`; both persist across reload
- [ ] Inset click-to-swap works and animates
- [ ] Prose measure never exceeds 64ch at any card width
- [ ] Full keyboard operation: `←` `→` `⌘B` `⌘\` `Esc`; focus always visible
- [ ] `prefers-reduced-motion` removes all transitions
- [ ] Body prose clears 7:1 contrast over the terrain at its brightest

## Phase 3 — Code blocks and Lesson 02

Build the extractor and the code block, then migrate Lesson 02 into two chapters of
8–12 steps each. This is the real test of the nested shape.

Accept when:

- [x] `scripts/extract-code.mjs` handles `fn` and `region`, and fails the build on a miss
- [x] Code blocks render with Shiki using the custom theme; highlights are correct
- [x] Renaming a referenced function breaks the build with a message naming the step
- [x] Lesson 02 is two chapters, 8–12 steps each, all four previews working
- [x] `NoiseTerrainLesson.jsx` / `.css` deleted; `src/lessons/` gone
- [x] Q3 compare toggle works on at least one step

## Phase 4 — Practice

`match`, `fill`, `implement`, and the Worker sandbox. At least two of each kind placed
across the two lessons.

Accept when:

- [ ] All three kinds work end to end and persist results
- [ ] Worker terminates on a 2s timeout and reports it without breaking the page
- [ ] An infinite loop in learner code does not freeze the UI
- [ ] `implement` renders learner map, reference map, and difference map
- [ ] Practice never blocks Next

## Phase 5 — Tutor

Index build, in-browser embedding, the three entry points, the Vercel functions, auth
and rate limiting.

Accept when:

- [ ] `npm run build:index` produces `public/rag-index.json` under 400KB
- [ ] Retrieval returns sensible top-6 for ten hand-written test questions
- [ ] A visitor with no passphrase gets ranked links and a clear explanation
- [ ] Passphrase unlocks generation; the key never appears in the client bundle
      (grep the build output to prove it)
- [ ] Chinese questions are translated before retrieval and answered in Chinese
- [ ] I1, I2, I3 all work and send the right context
- [ ] Rate limits return 429 with a message the UI shows plainly
- [ ] Model download shows honest progress and fails gracefully to keyword search

## Phase 6 — Review, polish, deploy

Review cards from `keywords`, progress in the outline, lesson overview pages, empty and
error states, deployment.

Accept when:

- [ ] End-of-chapter review generated from `keywords` and `goal`
- [ ] Outline shows per-step and per-group completion
- [ ] Every error and empty state says what happened and what to do
- [ ] Deployed to Vercel with environment variables set
- [ ] A person who has never seen the site can finish Lesson 01 without asking anything

---

## After the roadmap

In order, when the time comes:

1. Write Lessons 03+.
2. The `<Term>` syntax layer — after watching real learners, so it addresses real
   confusion rather than guessed confusion.
3. Supabase accounts and cross-device progress.
4. Mobile.