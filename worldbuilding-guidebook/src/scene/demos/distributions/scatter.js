import { Matrix4, Quaternion, Vector3 } from 'three'
import { fractalNoise } from '../proceduralMaps/noiseMath.js'
import { createRandom } from './random.js'
import { SCATTER_WORLD_SIZE, buildWaterDistanceGrid, distanceToWaterAt, heightAt, normaliseNoise } from './terrain.js'

// Candidates stay this far inside the edge, so a rock never hangs over a wall.
const FOOTPRINT_SIZE = 0.94 * SCATTER_WORLD_SIZE

const ACCEPTANCE_SEED_OFFSET = 7919
const MASK_SEED = 5

// Every candidate draws x, then z, in the same order. A larger count therefore
// continues the same sequence: the first candidates keep their places and the
// new ones are added after them.
export function generateCandidates(count, seed) {
  const random = createRandom(seed)
  const candidates = []

  for (let index = 0; index < count; index += 1) {
    const x = (random() - 0.5) * FOOTPRINT_SIZE
    const z = (random() - 0.5) * FOOTPRINT_SIZE
    const y = heightAt(x, z)
    candidates.push({ x, y, z })
  }

  return candidates
}

// One instance's transform: moved to its candidate and scaled by the asset
// scale. The count of candidates plays no part in it.
export function instanceMatrix(candidate, scale, target = new Matrix4()) {
  return target.compose(
    new Vector3(candidate.x, candidate.y, candidate.z),
    new Quaternion(),
    new Vector3(scale, scale, scale),
  )
}

// Acceptance values come from their own generator, so drawing them never moves
// a candidate. Candidate i always gets the same value, whatever the density or
// the noise frequency are.
export function drawAcceptanceValues(count, seed) {
  const random = createRandom(seed + ACCEPTANCE_SEED_OFFSET)
  return Array.from({ length: count }, () => random())
}

// The mask noise has its own seed, separate from the terrain and the scatter
// seeds. It is stretched to fill 0 to 1; without that, a density of 1 would
// still fill only half of the brightest patches.
export function maskNoiseAt(x, z, frequency) {
  const raw = fractalNoise('perlin', x, z, { frequency, octaves: 3, persistence: 0.5, seed: MASK_SEED })
  return normaliseNoise(raw)
}

// Uniform scattering reads no map, which is the same as a map that is 1
// everywhere.
export function placementNoiseAt(placementMode, frequency) {
  return placementMode === 'noise' ? (x, z) => maskNoiseAt(x, z, frequency) : () => 1
}

export function placementProbability(noiseValue, density) {
  return noiseValue * density
}

// One verdict per candidate: true when it is accepted.
export function acceptCandidates(candidates, acceptanceValues, density, noiseAt) {
  return candidates.map((candidate, index) => {
    const probability = placementProbability(noiseAt(candidate.x, candidate.z), density)
    // #region acceptanceTest
    const randomValue = acceptanceValues[index]
    return randomValue < probability
    // #endregion
  })
}

// Everything the scene and the map need, from the settings alone.
export function buildLayout({ candidateCount, seed, density, noiseFrequency, placementMode }) {
  const candidates = generateCandidates(candidateCount, seed)
  const noiseAt = placementNoiseAt(placementMode, noiseFrequency)
  const accepted = acceptCandidates(candidates, drawAcceptanceValues(candidateCount, seed), density, noiseAt)
  return { candidates, accepted, noiseAt }
}

// One candidate at the centre of every cell of a regular grid, with the grid
// centred on the footprint. Neighbouring candidates are exactly cellSize apart.
export function generateLatticeCandidates(cellSize) {
  const cellsPerSide = Math.floor(FOOTPRINT_SIZE / cellSize)
  const start = -(cellsPerSide * cellSize) / 2 + cellSize / 2
  const candidates = []

  for (let row = 0; row < cellsPerSide; row += 1) {
    for (let column = 0; column < cellsPerSide; column += 1) {
      const x = start + column * cellSize
      const z = start + row * cellSize
      candidates.push({ x, y: heightAt(x, z), z })
    }
  }

  return candidates
}

// A field tile is accepted when it is close enough to water and above it.
// distanceAt reads the distance-to-water map at a position.
export function acceptFields(candidates, distanceAt, irrigationBand, waterLevel) {
  return candidates.map((candidate) => {
    const distanceToWater = distanceAt(candidate.x, candidate.z)
    const height = candidate.y
    // #region irrigationRule
    return distanceToWater < irrigationBand && height > waterLevel
    // #endregion
  })
}

// A flat tile: moved to its candidate and stretched to its footprint. The tile
// mesh itself is one unit wide.
export function tileMatrix(candidate, tileSize, target = new Matrix4()) {
  return target.compose(
    new Vector3(candidate.x, candidate.y, candidate.z),
    new Quaternion(),
    new Vector3(tileSize, 1, tileSize),
  )
}

// Everything the farmland scene needs, from the settings alone. A random layout
// has as many candidates as the lattice, so the two sides are a fair comparison.
export function buildFarmLayout({ cellSize, seed, irrigationBand, waterLevel, candidateSource }) {
  const lattice = generateLatticeCandidates(cellSize)
  const candidates = candidateSource === 'lattice' ? lattice : generateCandidates(lattice.length, seed)
  const grid = buildWaterDistanceGrid(waterLevel)
  const accepted = acceptFields(candidates, (x, z) => distanceToWaterAt(grid, x, z), irrigationBand, waterLevel)
  return { candidates, accepted, grid }
}
