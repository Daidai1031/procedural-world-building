import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { createErosionState, stepHydraulicErosion, DEFAULT_SIMULATION_SETTINGS } from '../src/scene/demos/proceduralMaps/simulationMath.js'
import { sampleProceduralMap, DEFAULT_MAP_SETTINGS } from '../src/scene/demos/proceduralMaps/noiseMath.js'

const baselineSource = execFileSync('git', ['show', 'HEAD:worldbuilding-guidebook/src/scene/demos/proceduralMaps/noiseMath.js'], { encoding: 'utf8' })
const baseline = await import(`data:text/javascript;base64,${Buffer.from(baselineSource).toString('base64')}`)
function measure(sample) {
  const start = performance.now()
  let checksum = 0
  for (let repeat = 0; repeat < 10; repeat++) {
    for (let i = 0; i < 48 * 48; i++) checksum += sample(i % 48 / 47 * 10 - 5, Math.floor(i / 48) / 47 * 10 - 5, DEFAULT_MAP_SETTINGS)
  }
  return { milliseconds: (performance.now() - start) / 10, checksum }
}
for (let i = 0; i < 10; i++) { measure(baseline.sampleProceduralMap); measure(sampleProceduralMap) }
const original = []
const resolved = []
for (let i = 0; i < 21; i++) {
  original.push(measure(baseline.sampleProceduralMap).milliseconds)
  resolved.push(measure(sampleProceduralMap).milliseconds)
}
function median(values) { return values.sort((a, b) => a - b)[Math.floor(values.length / 2)] }
let simulation = createErosionState(DEFAULT_MAP_SETTINGS, DEFAULT_SIMULATION_SETTINGS)
for (let i = 0; i < 100; i++) simulation = stepHydraulicErosion(simulation, DEFAULT_SIMULATION_SETTINGS)
const start = performance.now()
for (let i = 0; i < 1000; i++) simulation = stepHydraulicErosion(simulation, DEFAULT_SIMULATION_SETTINGS)
const stepMs = (performance.now() - start) / 1000
const result = { baseline48GridMs: median(original), resolver48GridMs: median(resolved), erosionStepMs: stepMs, configuredHz: 10, maximumHz: 20, maximumRateBudgetMs: 50, erosionBudgetPercent: stepMs / 50 * 100 }
result.resolverGridOverheadMs = result.resolver48GridMs - result.baseline48GridMs
await mkdir('artifacts/phase4a', { recursive: true })
await writeFile('artifacts/phase4a/performance.json', JSON.stringify(result, null, 2))
console.log(result)
