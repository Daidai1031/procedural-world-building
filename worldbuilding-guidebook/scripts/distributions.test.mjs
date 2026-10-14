import assert from 'node:assert/strict'
import test from 'node:test'
import { Vector3 } from 'three'
import { createRandom } from '../src/scene/demos/distributions/random.js'
import { buildRockGeometry } from '../src/scene/demos/distributions/rock.js'
import {
  acceptCandidates,
  buildFarmLayout,
  buildLayout,
  drawAcceptanceValues,
  generateCandidates,
  generateLatticeCandidates,
  instanceMatrix,
  maskNoiseAt,
  placementNoiseAt,
  placementProbability,
} from '../src/scene/demos/distributions/scatter.js'
import {
  SCATTER_WORLD_SIZE,
  WATER_LEVEL_RANGE,
  buildTerrainSurface,
  buildWaterDistanceGrid,
  distanceToWaterAt,
  heightAt,
  moistureAt,
} from '../src/scene/demos/distributions/terrain.js'

test('the seeded generator repeats its sequence and stays in [0, 1)', () => {
  const first = createRandom(42)
  const second = createRandom(42)
  const values = Array.from({ length: 1000 }, () => first())
  assert.deepEqual(values, Array.from({ length: 1000 }, () => second()))
  assert.ok(values.every((value) => value >= 0 && value < 1))
  assert.notDeepEqual(values.slice(0, 10), Array.from({ length: 10 }, createRandom(43)))
})

test('candidates: requested count, inside the footprint, y from the terrain', () => {
  const candidates = generateCandidates(200, 42)
  assert.equal(candidates.length, 200)
  for (const { x, y, z } of candidates) {
    assert.ok(Math.abs(x) < SCATTER_WORLD_SIZE / 2 && Math.abs(z) < SCATTER_WORLD_SIZE / 2)
    assert.equal(y, heightAt(x, z))
  }
  assert.deepEqual(generateCandidates(0, 42), [])
})

test('same seed gives the same layout, another seed a different one', () => {
  assert.deepEqual(generateCandidates(100, 42), generateCandidates(100, 42))
  assert.notDeepEqual(generateCandidates(100, 42), generateCandidates(100, 43))
})

test('a larger count keeps the first candidates where they were', () => {
  assert.deepEqual(generateCandidates(200, 42).slice(0, 100), generateCandidates(100, 42))
})

test('the scatter seed does not change the terrain', () => {
  const before = buildTerrainSurface().positions
  generateCandidates(400, 7)
  assert.deepEqual(buildTerrainSurface().positions, before)
})

test('instance matrices: scale ignores the count, position is the candidate', () => {
  for (const count of [10, 200, 400]) {
    for (const candidate of generateCandidates(count, 42)) {
      const matrix = instanceMatrix(candidate, 1.3)
      const scale = new Vector3().setFromMatrixScale(matrix)
      const position = new Vector3().setFromMatrixPosition(matrix)
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(Math.abs(scale[axis] - 1.3) < 1e-6)
        assert.ok(Math.abs(position[axis] - candidate[axis]) < 1e-6)
      }
    }
  }
})

test('the rock base sits just below its origin, so it rests on its point', () => {
  const geometry = buildRockGeometry()
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  assert.ok(min.y < 0, 'base is sunk a little into the ground')
  assert.ok(-min.y < (max.y - min.y) * 0.3, 'most of the rock is above ground')
})

const layoutSettings = { candidateCount: 300, seed: 42, density: 0.8, noiseFrequency: 0.5, placementMode: 'noise' }
const acceptedCount = (settings) => buildLayout(settings).accepted.filter(Boolean).length

test('acceptance values: own stream, one per candidate, in [0, 1), stable across settings', () => {
  const values = drawAcceptanceValues(300, 42)
  assert.equal(values.length, 300)
  assert.ok(values.every((value) => value >= 0 && value < 1))
  assert.deepEqual(values, drawAcceptanceValues(300, 42))
  assert.deepEqual(drawAcceptanceValues(100, 42), values.slice(0, 100))
  assert.notDeepEqual(values.slice(0, 10), generateCandidates(10, 42).map((candidate) => candidate.x))
})

test('density 0 accepts nothing, density 1 on a flat map accepts everything', () => {
  assert.equal(acceptedCount({ ...layoutSettings, density: 0 }), 0)
  assert.equal(acceptedCount({ ...layoutSettings, density: 1, placementMode: 'uniform' }), 300)
  const candidates = generateCandidates(300, 42)
  assert.ok(acceptCandidates(candidates, drawAcceptanceValues(300, 42), 1, () => 1).every(Boolean))
})

test('the mask noise stays in [0, 1] and is not flat', () => {
  const values = []
  for (let x = -3; x <= 3; x += 0.1) for (let z = -3; z <= 3; z += 0.1) values.push(maskNoiseAt(x, z, 0.5))
  assert.ok(values.every((value) => value >= 0 && value <= 1))
  assert.ok(Math.min(...values) < 0.1 && Math.max(...values) > 0.9)
  assert.equal(placementNoiseAt('uniform', 0.5)(1, 1), 1)
})

test('probability is noise times density', () => {
  assert.equal(placementProbability(0.5, 0.8), 0.4)
  assert.equal(placementProbability(1, 0.8), 0.8)
})

test('raising density only adds accepted candidates; the first ones stay accepted', () => {
  const lower = buildLayout({ ...layoutSettings, density: 0.4 }).accepted
  const higher = buildLayout({ ...layoutSettings, density: 0.9 }).accepted
  lower.forEach((isAccepted, index) => { if (isAccepted) assert.ok(higher[index]) })
  assert.ok(higher.filter(Boolean).length > lower.filter(Boolean).length)
})

test('changing frequency moves no candidate and keeps every acceptance value', () => {
  const first = buildLayout(layoutSettings)
  const second = buildLayout({ ...layoutSettings, noiseFrequency: 1.1 })
  assert.deepEqual(first.candidates, second.candidates)
  assert.notDeepEqual(first.accepted, second.accepted)
})

test('noise makes patches: accepted candidates sit where the map is higher', () => {
  const noise = buildLayout(layoutSettings)
  const uniform = buildLayout({ ...layoutSettings, placementMode: 'uniform' })
  const meanNoiseOf = (layout) => {
    const picked = layout.candidates.filter((_, index) => layout.accepted[index])
    return picked.reduce((sum, candidate) => sum + maskNoiseAt(candidate.x, candidate.z, 0.5), 0) / picked.length
  }
  assert.ok(meanNoiseOf(noise) > meanNoiseOf(uniform) + 0.1)
})

const farmSettings = { cellSize: 0.6, seed: 42, irrigationBand: 0.6, waterLevel: 1.7, candidateSource: 'lattice' }
const TILE_FILL = 0.92

test('lattice: floor(size / cell)² candidates, neighbours exactly one cell apart, y from the terrain', () => {
  for (const cellSize of [0.4, 0.6, 1.1]) {
    const candidates = generateLatticeCandidates(cellSize)
    const cellsPerSide = Math.floor((0.94 * SCATTER_WORLD_SIZE) / cellSize)
    assert.equal(candidates.length, cellsPerSide ** 2)
    candidates.forEach((candidate, index) => {
      assert.equal(candidate.y, heightAt(candidate.x, candidate.z))
      if ((index + 1) % cellsPerSide !== 0) assert.ok(Math.abs(candidates[index + 1].x - candidate.x - cellSize) < 1e-9 && candidates[index + 1].z === candidate.z)
    })
    assert.ok(Math.abs(candidates[0].x + candidates.at(-1).x) < 1e-9, 'the lattice is centred')
  }
})

test('distance to water is 0 in water, positive on land, and matches a brute-force search', () => {
  const waterLevel = 1.7
  const grid = buildWaterDistanceGrid(waterLevel)
  const random = createRandom(9)
  const waterPoints = []
  for (let row = 0; row < grid.size; row += 1) {
    for (let column = 0; column < grid.size; column += 1) {
      if (grid.distances[row * grid.size + column] === 0) waterPoints.push([-SCATTER_WORLD_SIZE / 2 + column * grid.spacing, -SCATTER_WORLD_SIZE / 2 + row * grid.spacing])
    }
  }
  assert.ok(waterPoints.length > 100)
  for (let sample = 0; sample < 200; sample += 1) {
    const x = (random() - 0.5) * 5.6
    const z = (random() - 0.5) * 5.6
    const distance = distanceToWaterAt(grid, x, z)
    if (heightAt(x, z) <= waterLevel - 0.05) assert.ok(distance < 1.5 * grid.spacing, 'deep water reads close to 0')
    const nearest = Math.min(...waterPoints.map(([waterX, waterZ]) => Math.hypot(x - waterX, z - waterZ)))
    assert.ok(Math.abs(distance - nearest) < 1.5 * grid.spacing, `(${x.toFixed(2)}, ${z.toFixed(2)}): grid ${distance.toFixed(3)}, brute force ${nearest.toFixed(3)}`)
  }
})

test('the distance grows inland from the shoreline and the water level moves it', () => {
  const low = buildWaterDistanceGrid(WATER_LEVEL_RANGE.min)
  const lowDistances = Float32Array.from(low.distances)
  const high = buildWaterDistanceGrid(WATER_LEVEL_RANGE.max)
  assert.ok(Math.max(...lowDistances) > Math.max(...high.distances) + 1, 'less water means a larger distance to it')
  assert.ok(high.distances.filter((distance) => distance === 0).length > 5000)
})

test('moisture stays in [0, 1] and is not flat', () => {
  const values = []
  for (let x = -3; x <= 3; x += 0.1) for (let z = -3; z <= 3; z += 0.1) values.push(moistureAt(x, z))
  assert.ok(values.every((value) => value >= 0 && value <= 1))
  assert.ok(Math.min(...values) < 0.1 && Math.max(...values) > 0.9)
})

test('accepted tiles are above the water and inside the band; the OR rule fails both checks', () => {
  for (const waterLevel of [1.4, 1.7, 2.0, 2.2]) {
    for (const irrigationBand of [0.3, 0.6, 1.5]) {
      const settings = { ...farmSettings, waterLevel, irrigationBand }
      const { candidates, accepted, grid } = buildFarmLayout(settings)
      candidates.forEach((candidate, index) => {
        const distance = distanceToWaterAt(grid, candidate.x, candidate.z)
        if (accepted[index]) {
          assert.ok(candidate.y > waterLevel, 'accepted below the water level')
          assert.ok(distance < irrigationBand, 'accepted outside the band')
        }
        assert.equal(accepted[index], distance < irrigationBand && candidate.y > waterLevel)
      })
    }
  }
  const { candidates, accepted, grid } = buildFarmLayout(farmSettings)
  const orRule = candidates.map((candidate) => distanceToWaterAt(grid, candidate.x, candidate.z) < farmSettings.irrigationBand || candidate.y > farmSettings.waterLevel)
  assert.ok(candidates.some((candidate, index) => orRule[index] && candidate.y <= farmSettings.waterLevel), 'OR accepts a submerged candidate')
  assert.ok(candidates.some((candidate, index) => orRule[index] && distanceToWaterAt(grid, candidate.x, candidate.z) >= farmSettings.irrigationBand), 'OR accepts a candidate far from water')
  assert.ok(orRule.filter(Boolean).length > accepted.filter(Boolean).length)
})

test('a wider band only adds tiles; a higher water level removes the ones it covers', () => {
  const narrow = buildFarmLayout({ ...farmSettings, irrigationBand: 0.4 }).accepted
  const wide = buildFarmLayout({ ...farmSettings, irrigationBand: 1.2 }).accepted
  narrow.forEach((isAccepted, index) => { if (isAccepted) assert.ok(wide[index]) })
  assert.ok(wide.filter(Boolean).length > narrow.filter(Boolean).length)
  const layout = buildFarmLayout({ ...farmSettings, irrigationBand: 5, waterLevel: 1.5 })
  const flooded = buildFarmLayout({ ...farmSettings, irrigationBand: 5, waterLevel: 2.1 })
  layout.candidates.forEach((candidate, index) => { if (flooded.accepted[index]) assert.ok(candidate.y > 2.1) })
})

test('lattice tiles never overlap; the same number of random tiles does', () => {
  const tileSize = farmSettings.cellSize * TILE_FILL
  const overlaps = (candidates) => {
    let count = 0
    candidates.forEach((first, index) => {
      for (const second of candidates.slice(index + 1)) if (Math.abs(first.x - second.x) < tileSize && Math.abs(first.z - second.z) < tileSize) count += 1
    })
    return count
  }
  const lattice = buildFarmLayout(farmSettings).candidates
  const random = buildFarmLayout({ ...farmSettings, candidateSource: 'random' }).candidates
  assert.equal(random.length, lattice.length)
  assert.equal(overlaps(lattice), 0)
  assert.ok(overlaps(random) > 0)
})
