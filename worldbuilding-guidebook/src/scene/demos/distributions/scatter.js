import { Matrix4, Quaternion, Vector3 } from 'three'
import { fractalNoise } from '../proceduralMaps/noiseMath.js'
import { createRandom } from './random.js'
import { SCATTER_WORLD_SIZE, buildWaterDistanceGrid, distanceToWaterAt, heightAt, moistureAt, normalAt, normaliseNoise } from './terrain.js'

// Candidates stay this far inside the edge, so a rock never hangs over a wall.
const FOOTPRINT_SIZE = 0.94 * SCATTER_WORLD_SIZE

const ACCEPTANCE_SEED_OFFSET = 7919
const MASK_SEED = 5
const WORLD_UP = new Vector3(0, 1, 0)

export const ASSET_SLOPE_LIMITS = {
  rock: 60,
  tree: 33,
  farmland: 8,
  antenna: 5,
}

// Every candidate draws x, then z, in the same order. A larger count therefore
// continues the same sequence: the first candidates keep their places and the
// new ones are added after them.
export function generateCandidates(count, seed) {
  const random = createRandom(seed)
  const candidates = []

  for (let index = 0; index < count; index += 1) {
    // #region candidateDrawOrder
    const x = (random() - 0.5) * FOOTPRINT_SIZE
    const z = (random() - 0.5) * FOOTPRINT_SIZE
    // #endregion
    const y = heightAt(x, z)
    candidates.push({ x, y, z })
  }

  return candidates
}

// One instance's transform: moved to its candidate and scaled by the asset
// scale. The count of candidates plays no part in it.
export function instanceMatrix(candidate, scale, target = new Matrix4()) {
  // #region instanceTransform
  return target.compose(
    new Vector3(candidate.x, candidate.y, candidate.z),
    new Quaternion(),
    new Vector3(scale, scale, scale),
  )
  // #endregion
}

export function slopeDegreesAt(candidate) {
  const dot = Math.min(1, Math.max(-1, normalAt(candidate.x, candidate.z).dot(WORLD_UP)))
  return Math.acos(dot) * 180 / Math.PI
}

export function acceptsSlope(candidate, maxSlopeDegrees) {
  const normal = normalAt(candidate.x, candidate.z)
  const maxSlopeRadians = maxSlopeDegrees * Math.PI / 180
  // #region slopeRule
  return normal.dot(WORLD_UP) >= Math.cos(maxSlopeRadians)
  // #endregion
}

// Tilt from world up to the terrain normal, then yaw around the object's local
// up. Multiplication in this order leaves the chosen up vector unchanged.
export function orientedInstanceMatrix(candidate, { alignToSurface = true, yaw = 0, scale = 1 } = {}, target = new Matrix4()) {
  const up = alignToSurface ? normalAt(candidate.x, candidate.z) : WORLD_UP
  // #region orientationRule
  const tilt = new Quaternion().setFromUnitVectors(WORLD_UP, up)
  const turn = new Quaternion().setFromAxisAngle(WORLD_UP, yaw)
  const orientation = tilt.multiply(turn)
  // #endregion
  return target.compose(
    new Vector3(candidate.x, candidate.y, candidate.z),
    orientation,
    new Vector3(scale, scale, scale),
  )
}

export function filterBySlope(candidates, maxSlopeDegrees) {
  const accepted = []
  const rejected = []
  for (const candidate of candidates) (acceptsSlope(candidate, maxSlopeDegrees) ? accepted : rejected).push(candidate)
  return { accepted, rejected }
}

export function applyMinimumSpacing(candidates, minimumSpacing) {
  if (minimumSpacing <= 0) return [...candidates]
  const accepted = []
  const cellSize = minimumSpacing
  const grid = new Map()
  const key = (x, z) => `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`

  for (const candidate of candidates) {
    const cellX = Math.floor(candidate.x / cellSize)
    const cellZ = Math.floor(candidate.z / cellSize)
    let clear = true
    for (let dz = -1; dz <= 1 && clear; dz += 1) {
      for (let dx = -1; dx <= 1 && clear; dx += 1) {
        for (const other of grid.get(`${cellX + dx},${cellZ + dz}`) ?? []) {
          // #region spacingRule
          if (Math.hypot(candidate.x - other.x, candidate.z - other.z) < minimumSpacing) clear = false
          // #endregion
        }
      }
    }
    if (!clear) continue
    accepted.push(candidate)
    const bucketKey = key(candidate.x, candidate.z)
    grid.set(bucketKey, [...(grid.get(bucketKey) ?? []), candidate])
  }
  return accepted
}

export function findBaseAnchor(candidates, waterLevel = 1.7) {
  const edge = SCATTER_WORLD_SIZE / 2 - 0.8
  const suitable = candidates.filter((candidate) => candidate.y > waterLevel && Math.abs(candidate.x) < edge && Math.abs(candidate.z) < edge)
  return suitable.reduce((best, candidate) => !best || slopeDegreesAt(candidate) < slopeDegreesAt(best) ? candidate : best, null)
}

export function outsideRadius(candidate, anchor, radius) {
  return !anchor || Math.hypot(candidate.x - anchor.x, candidate.z - anchor.z) >= radius
}

export function terrainDrivenScale(moisture, randomValue, terrainDriven = true) {
  // #region moistureScale
  const baseScale = terrainDriven ? 0.8 + (1.2 - 0.8) * moisture : 1
  // #endregion
  return baseScale * (0.95 + randomValue * 0.1)
}

function decorate(candidates, seed, { alignToSurface, terrainDriven = false, fixedScale = 1, allowYaw = true } = {}) {
  const random = createRandom(seed)
  return candidates.map((candidate) => {
    const moisture = moistureAt(candidate.x, candidate.z)
    return {
      candidate,
      alignToSurface,
      moisture,
      yaw: allowYaw ? (random() - 0.5) * Math.PI * 2 : 0,
      scale: terrainDriven ? terrainDrivenScale(moisture, random(), true) : fixedScale * (0.95 + random() * 0.1),
    }
  })
}

export function buildPopulation({ seed = 42, exclusionRadius = 0.9, antennaSpacing = 1.2, terrainDriven = true } = {}) {
  const waterLevel = 1.7
  const anchorCandidates = generateCandidates(80, seed + 401)
  const anchor = findBaseAnchor(anchorCandidates, waterLevel)
  const outsideBase = (candidate) => outsideRadius(candidate, anchor, exclusionRadius)

  const treeCandidates = generateCandidates(220, seed + 101)
  const treeValues = drawAcceptanceValues(treeCandidates.length, seed + 101)
  const trees = treeCandidates.filter((candidate, index) =>
    treeValues[index] < placementProbability(maskNoiseAt(candidate.x, candidate.z, 0.45), 0.8) &&
    moistureAt(candidate.x, candidate.z) > 0.18 && acceptsSlope(candidate, ASSET_SLOPE_LIMITS.tree) && outsideBase(candidate))

  const rocks = generateCandidates(110, seed + 201)
    .filter((candidate) => acceptsSlope(candidate, ASSET_SLOPE_LIMITS.rock) && outsideBase(candidate))

  const waterGrid = buildWaterDistanceGrid(waterLevel)
  const farmland = generateLatticeCandidates(0.6).filter((candidate) =>
    distanceToWaterAt(waterGrid, candidate.x, candidate.z) < 0.7 && candidate.y > waterLevel &&
    acceptsSlope(candidate, ASSET_SLOPE_LIMITS.farmland) && outsideBase(candidate))

  const antennaCandidates = generateCandidates(80, seed + 301)
    .filter((candidate) => acceptsSlope(candidate, ASSET_SLOPE_LIMITS.antenna) && outsideBase(candidate))
  const antennas = applyMinimumSpacing(antennaCandidates, antennaSpacing)

  return {
    anchor,
    tree: decorate(trees, seed + 111, { alignToSurface: false, terrainDriven }),
    rock: decorate(rocks, seed + 211, { alignToSurface: true, fixedScale: 0.95 }),
    farmland: decorate(farmland, seed + 311, { alignToSurface: true, terrainDriven, allowYaw: false }),
    antenna: decorate(antennas, seed + 411, { alignToSurface: false, fixedScale: 1, allowYaw: false }),
  }
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
