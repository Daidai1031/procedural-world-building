// Phase 5, the course tutor with retrieval, is shelved until every lesson is
// written. While this is false it has no presence in the interface: no drawer,
// no "Ask about this step" box, no "Explain this" popover, no rail button, no
// Ctrl/Cmd+K, and no "Ask about this task" offers in practice.
//
// Everything behind it is kept as it was: src/tutor/, api/, scripts/build-index.mjs,
// and the phase 5 tests. To bring the tutor back, set this to true, restore
// `npm run build:index` to the prebuild script in package.json, and remove the
// skips in tests/phase5.spec.js and scripts/phase5.test.mjs.
export const TUTOR_ENABLED = false
