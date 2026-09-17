import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { tokenizer } from 'acorn'
import { parse } from 'yaml'
import { extractAll, extractSnippet } from './extract-code.mjs'
import { matchDistance, normalizeWhitespace, withinTolerance } from '../src/practice/scoring.js'
import { fractalNoise, shapeValue } from '../src/scene/demos/proceduralMaps/noiseMath.js'

const LIVE_EDIT_TARGETS = ['shapeValue', 'fractalNoise', 'valueNoise2D', 'perlin2d', 'stepHydraulicErosion']
const evidence = {}

async function authoredSteps(directory = 'content/lessons', collected = []) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(directory, entry.name).replaceAll('\\', '/')
    if (entry.isDirectory()) await authoredSteps(target, collected)
    else if (entry.name.endsWith('.mdx')) {
      const raw = await readFile(target, 'utf8')
      collected.push({ file: target, frontmatter: parse(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]) })
    }
  }
  return collected
}

function tokenizes(value) {
  try {
    Array.from(tokenizer(value, { ecmaVersion: 'latest' }))
    return true
  } catch {
    return false
  }
}

// baseNoise is module private. One octave at frequency 1 and amplitude 1 is
// exactly one call to it, which is how the near misses below reach it.
function baseNoise(type, x, y, seed) {
  return fractalNoise(type, x, y, { frequency: 1, octaves: 1, persistence: 1, seed })
}

function fractalNoiseVariant(mistake) {
  return (type, x, y, settings) => {
    let value = 0
    let amplitude = 1
    let frequency = settings.frequency
    let amplitudeTotal = 0
    for (let octave = 0; octave < settings.octaves; octave += 1) {
      const seed = mistake === 'same seed every octave' ? settings.seed : settings.seed + octave * 131
      if (mistake === 'doubles the frequency before sampling') frequency *= 2
      value += baseNoise(type, x * frequency, y * frequency, seed) * (mistake === 'adds every layer at full strength' ? 1 : amplitude)
      amplitudeTotal += amplitude
      if (mistake !== 'never applies persistence') amplitude *= settings.persistence
      if (mistake !== 'forgets to double the frequency' && mistake !== 'doubles the frequency before sampling') frequency *= 2
    }
    return mistake === 'divides by octaves' ? value / settings.octaves : value / amplitudeTotal
  }
}

function shapeValueVariant(mistake) {
  return (value, shaping) => {
    if (shaping === 'terracing') {
      if (mistake === 'rounds before scaling') return Math.round(value) * 6
      if (mistake === 'three bands') return Math.round(value * 3) / 3
      if (mistake === 'twelve bands') return Math.round(value * 12) / 12
      if (mistake === 'floors instead of rounds') return Math.floor(value * 6) / 6
    }
    if (shaping === 'power') {
      if (mistake === 'squares instead of 2.2') return value ** 2
      if (mistake === 'multiplies by 2.2') return value * 2.2
    }
    if (mistake === 'drops the final return' && !['ridged', 'billow', 'turbulence', 'terracing', 'power'].includes(shaping)) return 0
    return shapeValue(value, shaping)
  }
}

function worstDifference(candidate, reference, cases) {
  return cases.reduce((worst, args) => Math.max(worst, Math.abs(candidate(...args) - reference(...args))), 0)
}

test('every authored blank accepts its answer, rejects its distractors, and sits where CodeBlock looks for it', async () => {
  const fills = (await authoredSteps()).filter((step) => step.frontmatter.practice?.kind === 'fill')
  assert.equal(fills.length, 4)
  for (const { file, frontmatter } of fills) {
    const { from, blanks, prompt } = frontmatter.practice
    // A fill renders nothing but a code block and its controls, so the prompt is
    // the only place the question itself can live.
    assert.ok(prompt?.trim(), `${file}: a fill needs a prompt`)
    const snippet = extractSnippet(await readFile(from.file, 'utf8'), from, file)
    const lines = snippet.code.split('\n')
    const seen = new Set()
    for (const blank of blanks) {
      const line = lines[blank.line - 1]
      assert.ok(line, `${file}: blank ${blank.line} is past the end of the snippet`)
      // CodeBlock splices at the first occurrence, and only one blank per line.
      assert.equal(line.indexOf(blank.answer), line.lastIndexOf(blank.answer), `${file}: ambiguous answer on line ${blank.line}`)
      assert.ok(line.includes(blank.answer), `${file}: answer is not on line ${blank.line}`)
      assert.ok(!seen.has(blank.line), `${file}: two blanks share line ${blank.line}`)
      seen.add(blank.line)
      assert.ok(blank.hint && !blank.hint.includes(blank.answer), `${file}: the hint gives the answer away`)
      assert.ok(!prompt.includes(blank.answer), `${file}: the prompt gives the answer away`)
      const answer = normalizeWhitespace(blank.answer)
      assert.equal(normalizeWhitespace(`  ${blank.answer}\t`), answer, `${file}: spacing changes the verdict`)
      assert.ok(blank.options.includes(blank.answer), `${file}: the answer is not offered`)
      for (const option of blank.options) {
        if (option === blank.answer) continue
        assert.notEqual(normalizeWhitespace(option), answer, `${file}: "${option}" is accepted as correct`)
      }
    }
  }
})

test('no task reads the fragment its own step displays, and live editing stays on supported targets', async () => {
  const steps = await authoredSteps()
  const identity = (reference) => `${reference.file}#${reference.fn ?? reference.region}`
  const editable = []
  const kinds = []
  for (const { file, frontmatter } of steps) {
    const { code, practice } = frontmatter
    if (practice) kinds.push(practice.kind)
    const from = practice?.from ?? practice?.reference
    // StepCard renders the step's own code block directly above its practice,
    // so a task that reads the same fragment is printing its own answer.
    if (code && from) assert.notEqual(identity(from), identity(code), `${file}: the task reads the code shown above it`)
    if (!code?.editable) continue
    editable.push(file)
    assert.ok(code.fn, `${file}: EditableCode overrides by function name, so editable needs code.fn`)
    assert.ok(LIVE_EDIT_TARGETS.includes(code.fn), `${file}: ${code.fn} is not a supported live edit target`)
    // sampleProceduralMap asks whether it has been overridden on its own first
    // line, so applying its unmodified source calls itself until the sandbox
    // times out. It is a supported override, but never an editable block.
    assert.notEqual(code.fn, 'sampleProceduralMap', `${file}: editing sampleProceduralMap recurses into itself`)
    assert.ok(code.highlight?.length, `${file}: an editable block still marks the lines it teaches`)
    const snippet = extractSnippet(await readFile(code.file, 'utf8'), code, file)
    for (const line of code.highlight) assert.ok(snippet.code.split('\n')[line - 1].trim(), `${file}: highlight ${line} is blank`)
  }
  assert.equal(editable.length, 3)
  assert.deepEqual(kinds.toSorted(), ['fill', 'fill', 'fill', 'fill', 'implement', 'implement', 'match', 'match'])
})

test('match tolerances separate the target from the settings a learner arrives with', async () => {
  const steps = (await authoredSteps()).filter((step) => step.frontmatter.practice?.kind === 'match')
  assert.equal(steps.length, 2)
  const measured = {}
  for (const { file, frontmatter } of steps) {
    const { target, compare, tolerance } = frontmatter.practice
    assert.ok(file.includes('/chapters/1-'), `${file}: match only scores in chapter 1`)
    assert.equal(matchDistance(target, target, compare), 0)
    const readings = {}
    const record = (label, settings) => {
      readings[label] = Number(matchDistance(target, settings, compare).toFixed(5))
      return readings[label]
    }
    if (compare.includes('frequency')) {
      for (const step of [-0.02, -0.01, 0.01, 0.02]) {
        const frequency = Number((target.frequency + step).toFixed(2))
        const distance = record(`frequency ${frequency}`, { frequency })
        assert.equal(distance <= tolerance, Math.abs(step) <= 0.01, `frequency ${frequency} landed on the wrong side of ${tolerance}`)
      }
      assert.ok(record('arrival 0.32', { frequency: 0.32 }) > tolerance * 5)
    } else {
      assert.ok(record('more layers only', { octaves: 6, persistence: 0.5 }) > tolerance)
      assert.ok(record('louder layers only', { octaves: 4, persistence: 0.8 }) > tolerance)
      assert.ok(record('arrival 4, 0.50', { octaves: 4, persistence: 0.5 }) > tolerance)
      assert.ok(record('one layer', { octaves: 1, persistence: 0.65 }) > tolerance * 5)
      assert.ok(record('5, 0.60', { octaves: 5, persistence: 0.6 }) <= tolerance)
      assert.ok(record('6, 0.65', { octaves: 6, persistence: 0.65 }) <= tolerance)
      // Nothing quiet enough to still read as smooth may pass.
      for (let octaves = 1; octaves <= 6; octaves += 1) {
        for (let index = 0; index <= 12; index += 1) {
          const persistence = Number((0.2 + index * 0.05).toFixed(2))
          if (matchDistance(target, { octaves, persistence }, compare) <= tolerance) assert.ok(octaves >= 5 && persistence >= 0.6, `${octaves}, ${persistence} passes`)
        }
      }
    }
    measured[file] = { target, tolerance, distances: readings }
  }
  evidence.match = measured
})

test('implement tolerances separate the reference from plausible near misses, and the starter never passes', async () => {
  const steps = (await authoredSteps()).filter((step) => step.frontmatter.practice?.kind === 'implement')
  assert.equal(steps.length, 2)
  const measured = {}
  for (const { file, frontmatter } of steps) {
    const { reference, cases, tolerance, visual, starter } = frontmatter.practice
    assert.equal(visual, true, `${file}: an implement without a difference map cannot be judged by eye`)
    assert.ok(reference.fn && cases.length >= 4)
    const args = cases.map((entry) => entry.args)
    const original = reference.fn === 'shapeValue' ? shapeValue : fractalNoise
    const variant = reference.fn === 'shapeValue' ? shapeValueVariant : fractalNoiseVariant
    const mistakes = reference.fn === 'shapeValue'
      ? ['rounds before scaling', 'three bands', 'twelve bands', 'floors instead of rounds', 'squares instead of 2.2', 'multiplies by 2.2', 'drops the final return']
      : ['never applies persistence', 'forgets to double the frequency', 'divides by octaves', 'same seed every octave', 'doubles the frequency before sampling', 'adds every layer at full strength']
    const differences = {}
    for (const mistake of mistakes) {
      const worst = worstDifference(variant(mistake), original, args)
      differences[mistake] = Number(worst.toPrecision(3))
      assert.ok(worst > tolerance * 1000, `${file}: "${mistake}" is only ${worst} away from the reference`)
      assert.ok(args.some((entry) => !withinTolerance(variant(mistake)(...entry), original(...entry), tolerance)), `${file}: no case catches "${mistake}"`)
    }
    // Pressing Run on the untouched starter must not pass: every blank in it is
    // a placeholder, and a task that accepts its own starter teaches nothing.
    assert.match(starter, /your code here/)
    measured[file] = { reference: reference.fn, tolerance, cases: args.length, differences }
  }
  evidence.implement = measured
  await mkdir('artifacts/phase4b', { recursive: true })
  await writeFile('artifacts/phase4b/tolerances.json', `${JSON.stringify(evidence, null, 2)}\n`)
})

test('answer comparison survives JSX and stays strict where acorn gives up', () => {
  // Fragments the extractor produces from .jsx sources are a valid JavaScript
  // token stream often enough to be misleading, so both sides are asserted.
  for (const value of ['[0, 1, 0]', 'near: 0.1, far: 200', 'args={[1.5, 1.5, 1.5]}', 'receiveShadow', '<planeGeometry args={[60, 60]} />']) {
    assert.equal(tokenizes(value), true, `${value} no longer tokenises`)
  }
  for (const value of ['</mesh>', '/>', '<mesh position={[0, 1, 0]}></mesh>']) {
    assert.equal(tokenizes(value), false, `${value} now tokenises, so the fallback is untested`)
    assert.equal(normalizeWhitespace(`  ${value}  `), normalizeWhitespace(value), `${value} is refused when padded`)
  }
  // Asymmetry is the case that matters: one side tokenises, the other falls
  // back. The tokenised side spaces every token and the fallback side keeps the
  // learner's spacing, so a wrong answer cannot collide with a right one.
  assert.equal(tokenizes('castShadow'), true)
  assert.equal(tokenizes('castShadow </mesh>'), false)
  assert.notEqual(normalizeWhitespace('castShadow'), normalizeWhitespace('castShadow </mesh>'))
  assert.notEqual(normalizeWhitespace('receiveShadow'), normalizeWhitespace('</mesh>'))
  assert.equal(tokenizes('< / mesh >'), false)
  assert.notEqual(normalizeWhitespace('< / mesh >'), normalizeWhitespace('</mesh>'))
  // Spacing inside a tokenised answer is still free.
  assert.equal(normalizeWhitespace('state.water[index]+settings.rainfall'), normalizeWhitespace('state.water[index] + settings.rainfall'))
  assert.notEqual(normalizeWhitespace('state.water[index] * settings.rainfall'), normalizeWhitespace('state.water[index] + settings.rainfall'))
})

test('a fill without a prompt fails the build, naming the step', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'worldbuilding-guidebook-prompt-'))
  try {
    const relative = 'content/lessons/02-maps/chapters/1-functions/steps/01-fill.mdx'
    const filename = path.join(root, relative)
    await mkdir(path.dirname(filename), { recursive: true })
    await mkdir(path.join(root, 'src'))
    await writeFile(path.join(root, 'content/lessons/02-maps/lesson.yaml'), 'slug: maps\n')
    await writeFile(path.join(root, 'src/math.js'), 'function shapeValue(value) { return value }')
    const step = (practice) => `---\ntitle: Fill\ngoal: Complete it.\npractice:\n  kind: fill\n${practice}  from: { file: src/math.js, fn: shapeValue }\n---\n`
    for (const practice of ['', '  prompt: ""\n', '  prompt: "   "\n']) {
      await writeFile(filename, step(practice))
      await assert.rejects(extractAll(root), (error) => {
        assert.ok(error.message.includes(relative), `the error must name the step: ${error.message}`)
        assert.match(error.message, /fill practice requires a prompt/)
        return true
      })
    }
    await writeFile(filename, step('  prompt: Fold the value into crests.\n'))
    assert.equal((await extractAll(root))['maps/fill:practice'].name, 'shapeValue')
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep))
    await rm(root, { recursive: true, force: true })
  }
})

test('the chapter guard reads the chapter number rather than its spelling', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'worldbuilding-guidebook-phase4b-'))
  try {
    await mkdir(path.join(root, 'content/lessons/02-maps'), { recursive: true })
    await writeFile(path.join(root, 'content/lessons/02-maps/lesson.yaml'), 'slug: maps\n')
    const write = async (relative) => {
      const filename = path.join(root, relative)
      await mkdir(path.dirname(filename), { recursive: true })
      await writeFile(filename, '---\npractice:\n  kind: match\n---\n')
      return filename
    }
    const first = await write('content/lessons/02-maps/chapters/1-functions/steps/01-match.mdx')
    await extractAll(root)
    await rm(first)
    // A flat lesson has no chapters at all, and chapter 2 has no noise map to
    // score against. Both must fail as loudly as a missing function does.
    await write('content/lessons/02-maps/chapters/2-simulation/steps/01-match.mdx')
    await assert.rejects(extractAll(root), /only supported in chapter 1/)
    await rm(path.join(root, 'content/lessons/02-maps/chapters'), { recursive: true })
    await write('content/lessons/02-maps/steps/01-match.mdx')
    await assert.rejects(extractAll(root), /only supported in chapter 1/)
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep))
    await rm(root, { recursive: true, force: true })
  }
})
