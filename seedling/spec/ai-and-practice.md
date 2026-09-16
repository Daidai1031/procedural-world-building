# Seedling — tutor, code, and practice spec

## 1. Code extraction (F2)

Snippets shown to learners are extracted from real source files at build time. Nothing
is hand-copied into content, so a snippet can never drift from the code that runs.

`scripts/extract-code.mjs` runs before dev and build (`predev` / `prebuild`) and writes
`src/generated/snippets.json`.

### Primary: by function name (T3)

```yaml
code:
  file: src/scene/demos/proceduralMaps/noiseMath.js
  fn: perlin2d
```

Parse the file with `acorn` (`ecmaVersion: 'latest'`, `sourceType: 'module'`), walk for
a `FunctionDeclaration`, or a `VariableDeclarator` whose init is a function, whose name
matches. Slice the source by the node's `start`/`end`. Include a preceding block
comment or run of line comments if it is directly attached.

This is the default. It never breaks on line shifts, and if the function is renamed the
build fails loudly with the step id and the missing name.

### Fallback: by region marker (T1)

For the cases where you need part of a function or a group of top-level constants:

```js
// #region noise-octaves
let amplitude = 1
for (let octave = 0; octave < octaves; octave += 1) {
  total += noise(x * frequency, y * frequency) * amplitude
  amplitude *= persistence
}
// #endregion
```

```yaml
code:
  file: src/scene/demos/proceduralMaps/noiseMath.js
  region: noise-octaves
```

Dedent to the shallowest line in the block. Strip the marker lines themselves.

### Rules

- **Never both** `fn` and `region` on one step.
- **Build fails on a miss.** A step pointing at a function that no longer exists must
  break the build, naming the step file and the identifier. Silent empty code blocks
  are how a course rots.
- `highlight` line numbers are 1-based and **relative to the extracted snippet**.
- Extraction output per snippet: `{ code, language, file, name, startLine }`.
  `startLine` is the real line in the source file, shown in the tutor's context so the
  model knows where the code sits.

## 2. Live editing (F3)

A small number of steps set `code.editable: true`. The block becomes a CodeMirror 6
editor seeded with the extracted snippet.

- The edited function is compiled and run in the same Web Worker sandbox as practice
  (§5). If it evaluates cleanly, it replaces the real function in the demo's math for
  as long as the learner stays on the step.
- Syntax or runtime error: the block shows the message inline and the scene keeps
  using the last good version. Never a blank screen, never a crash.
- A "Reset to original" button always present.
- Use this for at most 3–4 steps per lesson, at moments where editing *is* the lesson
  (the octave loop, the erosion rule). Everywhere else, read-only.

## 3. The tutor

### Shape

Retrieval runs entirely in the browser. Generation runs on the server behind a
passphrase. This split is deliberate: **anyone can search the course, only the owner
can generate answers.** A visitor without the passphrase still gets useful results —
a ranked list of relevant steps and documents, each a link — rather than a locked door.

```
question
   │
   ├─ contains non-Latin characters? ── yes ──▶ POST /api/translate-query
   │                                             (public, cheap, rate-limited)
   ▼
embed query in browser  (transformers.js, Xenova/all-MiniLM-L6-v2)
   │
   ▼
cosine similarity vs public/rag-index.json  → top 6 chunks
   │
   ├─ not authenticated ──▶ render chunks as "Related in this course" links. Stop.
   │
   ▼
POST /api/chat  { question, language, context, chunks }  →  streamed answer + citations
```

### Index construction

`scripts/build-index.mjs`, run by `npm run build:index`, also wired into `prebuild`.

**Sources, in priority order:**

1. `content/lessons/**/*.mdx` — strip frontmatter and JSX tags, keep prose. One chunk
   per step (they are already short). Carries `keywords` from frontmatter.
2. `content/sources/**/*.md` — course docs explicitly copied in. Chunk by heading;
   split any chunk over ~450 tokens with 60 tokens of overlap.
3. `src/**/*.{js,jsx}` — one chunk per exported function, body plus its doc comment.

Never index `../docs/`, `spec/`, `prompts/`, `node_modules`, or generated files.

**Chunk record:**

```json
{
  "id": "step:procedural-maps/what-is-noise",
  "type": "step",
  "title": "Position, function, value",
  "text": "…",
  "keywords": ["determinism", "seed"],
  "lessonSlug": "procedural-maps",
  "stepSlug": "what-is-noise",
  "url": "/lesson/procedural-maps/what-is-noise",
  "path": "content/lessons/02-procedural-maps/…",
  "vector": [/* 384 int8 */]
}
```

**Embedding.** `@xenova/transformers` with `Xenova/all-MiniLM-L6-v2`, mean pooling,
L2-normalised. The build script and the browser must use **the same model id** — same
vector space or retrieval is noise.

Quantise to int8 (`Math.round(value * 127)`) and dequantise on load. 384 dims × ~800
chunks ≈ 300KB. Gzipped it is well under 200KB. No vector database. Do not add one.

**Ranking.** Cosine similarity, then a small boost: `+0.05` if any of the chunk's
`keywords` appears verbatim in the query, `+0.03` if the chunk is the step the learner
is currently on. Return top 6.

### Query translation

The index is English. The learner may ask in Chinese.

`POST /api/translate-query { question }` → `{ englishQuery, detectedLanguage }`.
Client calls it only when the question contains CJK characters (a cheap regex test —
do not call an API to detect a language you can see). Use a small fast model; this is
a translation, not a conversation.

Public endpoint, but rate-limited harder than `/api/chat` since it needs no auth.

### Generation

`POST /api/chat`, streamed. Request body:

```json
{
  "question": "为什么同样的坐标每次结果都一样？",
  "answerLanguage": "zh",
  "context": {
    "stepId": "procedural-maps/what-is-noise",
    "stepTitle": "Position, function, value",
    "selection": "const xi = Math.floor(x)",
    "selectionSource": "noiseMath.js:44",
    "params": { "seed": 42, "frequency": 1 }
  },
  "chunks": [ /* top 6, text + metadata, no vectors */ ]
}
```

System prompt, in outline:

> You are a teaching assistant for Seedling, a course on procedural world building.
> Your learners have no programming background.
> Answer only from the provided course excerpts. If they do not cover the question,
> say so plainly and suggest the closest step that does.
> Never invent an API, a function name, or a parameter that is not in the excerpts.
> Explain what code does before explaining how it is written.
> Keep answers under 150 words unless asked to go deeper.
> Answer in {answerLanguage}. Keep code, identifiers, and technical terms in English.
> End with the step titles you drew on. The interface turns them into links.

The client renders cited step titles as links to `/lesson/:lessonSlug/:stepSlug`. This
closes the loop: an answer sends the learner back into the course.

### Three entry points

| | Trigger | Context sent | History |
|---|---|---|---|
| **I1 drawer** | `⌘K`, or the rail button | current step | yes, per session |
| **I2 explain selection** | select text in a code block → floating "Explain this" | current step + selection + source location | no, one-shot, answer appears in a popover with an "open in drawer" action |
| **I3 inline ask** | input at the bottom of every step card | current step + current params | no, but the answer and question move into the drawer so it is not lost |

All three share one implementation. They differ only in what goes into `context` and
where the answer renders.

### Model loading (P2)

23MB is real. Handle it honestly:

- Do not load on page load. Load on the first tutor interaction of a session.
- Show a determinate progress bar with a plain label: "Downloading the search model
  (23 MB). This happens once."
- Cache via the browser's Cache API; transformers.js does this if configured.
- If loading fails, fall back to keyword matching over the index with MiniSearch and
  say so quietly. A degraded tutor beats a broken one.

## 4. Backend (O2 + S3)

Vercel serverless functions in `api/`. Node runtime.

```
api/
├── auth.js              POST  passphrase → session cookie
├── translate-query.js   POST  public, heavily rate-limited
└── chat.js              POST  requires session, streams
```

### Auth flow

1. `POST /api/auth { passphrase }`.
2. Compare against `TUTOR_PASSPHRASE` using `crypto.timingSafeEqual` on equal-length
   buffers. Never `===`.
3. On success, sign a JWT with `jose` (HS256, `SESSION_SECRET`, 7-day expiry, subject
   `tutor`) and set it as a cookie: `HttpOnly; Secure; SameSite=Lax; Path=/api;
   Max-Age=604800`.
4. On failure, a fixed 600ms delay, then 401. No hint about why.
5. `/api/chat` verifies the cookie on every request. No token in the body, no token in
   localStorage, no key ever reaching the browser.

### Rate limiting

`@upstash/ratelimit` on Upstash Redis.

| Endpoint | Limit |
|---|---|
| `/api/auth` | 5 attempts / 15 min / IP — brute-force guard |
| `/api/translate-query` | 20 / hour / IP |
| `/api/chat` | 40 / hour / session, and a global 800 / day kill switch |

The global daily cap is the thing that matters. If the passphrase ever leaks, it caps
the damage at a known number. When it trips, return 429 with a message the UI shows
plainly: "The tutor is at today's limit."

### Environment

```
ANTHROPIC_API_KEY
TUTOR_PASSPHRASE
SESSION_SECRET              # 32+ random bytes, base64
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

All server-side only. None prefixed `VITE_`. A `VITE_`-prefixed secret is a leaked
secret — Vite inlines those into the bundle.

`.env.example` lists every key with empty values and a comment. `.env*` stays
git-ignored.

## 5. Practice

Three kinds. A step names one. Results go to `progressStore`.

### G1 — `match`

Hit a target by adjusting parameters. No code. Good for early steps.

```yaml
practice:
  kind: match
  prompt: Make the coastline rougher without changing the overall shape.
  target: { noiseType: perlin, frequency: 1.4, octaves: 5, persistence: 0.55 }
  compare: [octaves, persistence]   # only these are scored
  tolerance: 0.08
  hints:
    - More octaves adds detail at smaller scales.
```

Scoring: render the target params and the learner's params to two 64×64 grids with the
existing `sampleProceduralMap`, take mean absolute difference. Pass when under
`tolerance`. Show a live "distance" meter so the learner can feel warmer/colder while
dragging — that feedback loop is the whole value of this task type.

### G2 — `fill`

Complete the code. Good for the step right after a concept lands.

```yaml
practice:
  kind: fill
  prompt: Make the smoothing ease in and out of each grid cell.   # required
  from: { file: …, fn: perlin2d }   # same extractor as §1
  blanks:
    - line: 4
      answer: "xf * xf * (3 - 2 * xf)"
      options: ["xf", "xf * xf * (3 - 2 * xf)", "Math.round(xf)"]
      hint: Smoothing should ease in and out, not move at a constant rate.
```

**`prompt` is required**, and carries the same meaning as `match`'s `prompt` and
`implement`'s `brief`: say what the learner should achieve, never which answer to pick.
It renders above the code block, before any control, so the learner reads the question
before meeting the blanks. A `fill` without one is a dropdown with nothing attached to
it, so both the loader and `scripts/extract-code.mjs` reject it by name and the build
fails.

Render the extracted snippet with the answer spans replaced by a select (when `options`
is present) or a text input (when it is not). Text answers are normalised for
whitespace before comparing. Wrong answer: the hint, and an offer to ask the tutor with
the blank pre-loaded as context.

### G3 — `implement`

Write a function, see your map next to the reference map.

```yaml
practice:
  kind: implement
  signature: "fbm(x, y, octaves, persistence)"
  brief: Stack several octaves of noise, each smaller and weaker than the last.
  starter: |
    function fbm(x, y, octaves, persistence) {
      // your code here
    }
  reference: { file: …, fn: fbm }
  cases:
    - args: [0, 0, 4, 0.5]
    - args: [1.5, -2.25, 6, 0.4]
  tolerance: 0.000001
  visual: true
```

Run in a Web Worker built from a Blob URL. The worker has no DOM, no `fetch`, no
access to the page. 2-second timeout, terminate and report on overrun. Learner code and
reference run on the same inputs; compare numerically against `tolerance`.

When `visual: true`, render both to 2D maps side by side plus an absolute-difference
map. Seeing *where* your terrain is wrong is what makes this task teachable rather than
a pass/fail gate.

Never auto-reveal the reference implementation. After three failed attempts, offer
"Compare with the course version" as an explicit choice.

### Shared behaviour

- **A task never reads the fragment its own step displays.** A step renders its code
  block and its practice together (`SPEC.md` §4), so a `fill` whose `from` is the
  fragment above it, or an `implement` whose `reference` is the function above it,
  prints its own answer. Read from what the previous step showed instead.
- Practice is never a gate. Next is always enabled.
- Pass marks the step complete and shows a quiet `--moss` check. No confetti.
- Every failure state offers the tutor with the task pre-loaded as context.
- Attempts and pass state persist in localStorage so a revisit shows prior work.