import { fractalNoise } from '../proceduralMaps/noiseMath.js'

// The volume is a cube. x and z run from -size/2 to size/2, y from 0 to size.
// Every constant below is a fraction or a cycle count of this size, so the
// terrain keeps its shape if the size changes.
export const VOXEL_WORLD_SIZE = 6

// Sign rule for every field in this file: negative inside, a signed distance
// field (SDF).
//   sdf(p) < 0   inside the solid
//   sdf(p) > 0   open air
//   sdf(p) = 0   the surface
// A sample is solid when its value is below the isovalue.
export const ISOVALUE = 0

export const DEFAULT_VOXEL_SETTINGS = {
  shape: 'ground',
  resolution: 16,
}

const GROUND_NOISE = { frequency: 3.2 / VOXEL_WORLD_SIZE, octaves: 4, persistence: 0.5, seed: 12 }
const GROUND_BASE_HEIGHT = 0.1 * VOXEL_WORLD_SIZE
const GROUND_HEIGHT_RANGE = 0.5 * VOXEL_WORLD_SIZE

const VOLUME_NOISE = { frequency: 3 / VOXEL_WORLD_SIZE, octaves: 3, persistence: 0.5, seed: 41 }
const CAVE_THRESHOLD = 0.6
const ISLAND_CENTER_HEIGHT = 0.5 * VOXEL_WORLD_SIZE
const ISLAND_THICKNESS = 0.42
const ISLAND_TAPER = 1 / VOXEL_WORLD_SIZE

// Scales a noise difference (about 0 to 1) into world units, so a density stays
// comparable to the height difference in the ground term.
const NOISE_TO_WORLD_UNITS = 0.5 * VOXEL_WORLD_SIZE

function lerp(a, b, amount) {
  return a + (b - a) * amount
}

function fade(value) {
  return value * value * value * (value * (value * 6 - 15) + 10)
}

function hash3D(x, y, z, seed) {
  let hash = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1103515245) + Math.imul(seed, 1442695041)
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295
}

export function valueNoise3D(x, y, z, seed) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const z0 = Math.floor(z)
  const tx = fade(x - x0)
  const ty = fade(y - y0)
  const tz = fade(z - z0)

  const lowerFront = lerp(hash3D(x0, y0, z0, seed), hash3D(x0 + 1, y0, z0, seed), tx)
  const upperFront = lerp(hash3D(x0, y0 + 1, z0, seed), hash3D(x0 + 1, y0 + 1, z0, seed), tx)
  const lowerBack = lerp(hash3D(x0, y0, z0 + 1, seed), hash3D(x0 + 1, y0, z0 + 1, seed), tx)
  const upperBack = lerp(hash3D(x0, y0 + 1, z0 + 1, seed), hash3D(x0 + 1, y0 + 1, z0 + 1, seed), tx)

  return lerp(lerp(lowerFront, upperFront, ty), lerp(lowerBack, upperBack, ty), tz)
}

export function fractalNoise3D(x, y, z, settings) {
  let value = 0
  let amplitude = 1
  let frequency = settings.frequency
  let amplitudeTotal = 0

  for (let octave = 0; octave < settings.octaves; octave += 1) {
    value += valueNoise3D(x * frequency, y * frequency, z * frequency, settings.seed + octave * 131) * amplitude
    amplitudeTotal += amplitude
    amplitude *= settings.persistence
    frequency *= 2
  }

  return value / amplitudeTotal
}

export function groundHeight(x, z) {
  return GROUND_BASE_HEIGHT + fractalNoise('perlin', x, z, GROUND_NOISE) * GROUND_HEIGHT_RANGE
}

// y - height is negative below the ground, so those samples are solid, and
// positive above it, so those samples are air. There is one height per (x, z),
// so the solid can never have empty space underneath it.
export function groundDensity(x, y, z) {
  return y - groundHeight(x, z)
}

// The ground with chambers subtracted: wherever the 3D noise is high, the
// value is pushed above zero, so the solid is removed there.
export function cavesDensity(x, y, z) {
  const chamber = (fractalNoise3D(x, y, z, VOLUME_NOISE) - CAVE_THRESHOLD) * NOISE_TO_WORLD_UNITS
  return Math.max(groundDensity(x, y, z), chamber)
}

// No ground at all: the value drops below zero only where 3D noise is high
// near a middle altitude, so separate masses hang in the air.
export function islandsDensity(x, y, z) {
  const required = ISLAND_THICKNESS + Math.abs(y - ISLAND_CENTER_HEIGHT) * ISLAND_TAPER
  return (required - fractalNoise3D(x, y, z, VOLUME_NOISE)) * NOISE_TO_WORLD_UNITS
}

// The second field for the CSG step: a sphere that straddles the ground.
export const CSG_SPHERE = { x: 0, y: 0.42 * VOXEL_WORLD_SIZE, z: 0, radius: 0.24 * VOXEL_WORLD_SIZE }

// The third field, for the CSG order step: a smaller sphere that overlaps the
// first one.
export const CSG_ROCK = { x: 0.16 * VOXEL_WORLD_SIZE, y: 0.4 * VOXEL_WORLD_SIZE, z: 0, radius: 0.2 * VOXEL_WORLD_SIZE }

function distanceToSphereSurface(sphere, x, y, z) {
  return Math.hypot(x - sphere.x, y - sphere.y, z - sphere.z) - sphere.radius
}

// The field of a sphere placed over the ground.
export function sphereDensity(x, y, z) {
  return distanceToSphereSurface(CSG_SPHERE, x, y, z)
}

export function rockDensity(x, y, z) {
  return distanceToSphereSurface(CSG_ROCK, x, y, z)
}

// A sample is solid in the union when either field calls it solid, so the
// smaller (more inside) value wins.
export function unionDensity(a, b) {
  return Math.min(a, b)
}

// Carves everything inside b out of a.
export function subtractDensity(a, b) {
  return Math.max(a, -b)
}

// A sample is solid in the intersection only when both fields call it solid, so
// the larger (more outside) value wins.
export function intersectDensity(a, b) {
  return Math.max(a, b)
}

// The dent Step 10 digs into the ground where the learner points. It is added to
// the ground field and fades to exactly nothing at its radius, so it changes no
// sample beyond that. That is what lets a chunk know it can be left alone.
export const DENT_RADIUS = 0.15 * VOXEL_WORLD_SIZE
const DENT_DEPTH = 0.1 * VOXEL_WORLD_SIZE

export function dentAt(x, z) {
  return { x, y: groundHeight(x, z), z, radius: DENT_RADIUS }
}

// A positive change lifts the value, and a higher value is more air, so the
// ground sinks where the dent is.
export function dentDensity(dent) {
  return (x, y, z) => {
    const distanceRatio = Math.hypot(x - dent.x, y - dent.y, z - dent.z) / dent.radius
    const fall = distanceRatio < 1 ? (1 - distanceRatio * distanceRatio) ** 2 : 0
    return groundDensity(x, y, z) + DENT_DEPTH * fall
  }
}

function groundWithSphere(combine) {
  return (x, y, z) => combine(groundDensity(x, y, z), sphereDensity(x, y, z))
}

// Each operation's result is the a of the next one, so this order lets the rock
// refill part of the room.
export function roomThenRockDensity(x, y, z) {
  const withRoom = subtractDensity(groundDensity(x, y, z), sphereDensity(x, y, z))
  return unionDensity(withRoom, rockDensity(x, y, z))
}

// The same three fields in the other order: the room is carved last, so nothing
// can refill it.
export function rockThenRoomDensity(x, y, z) {
  const withRock = unionDensity(groundDensity(x, y, z), rockDensity(x, y, z))
  return subtractDensity(withRock, sphereDensity(x, y, z))
}

// The csg-* shapes are not offered by the Step 03 shape control; the CSG demos
// pick one from their own controls.
const DENSITY_SHAPES = {
  ground: groundDensity,
  caves: cavesDensity,
  islands: islandsDensity,
  'csg-union': groundWithSphere(unionDensity),
  'csg-subtract': groundWithSphere(subtractDensity),
  'csg-intersect': groundWithSphere(intersectDensity),
  'csg-order-room-first': roomThenRockDensity,
  'csg-order-rock-first': rockThenRoomDensity,
}

export function sampleDensity(shape, x, y, z) {
  return (DENSITY_SHAPES[shape] ?? groundDensity)(x, y, z)
}

// A shape as a plain field function, for code that also takes edited fields.
export function shapeField(shape) {
  return (x, y, z) => sampleDensity(shape, x, y, z)
}

export function voxelIndex(resolution, sampleX, sampleY, sampleZ) {
  return sampleX + resolution * (sampleY + resolution * sampleZ)
}

// The distance between neighbouring samples along one axis.
export function sampleSpacing(resolution) {
  return VOXEL_WORLD_SIZE / (resolution - 1)
}

export function samplePosition(resolution, sampleX, sampleY, sampleZ) {
  const spacing = sampleSpacing(resolution)
  return [-VOXEL_WORLD_SIZE / 2 + sampleX * spacing, sampleY * spacing, -VOXEL_WORLD_SIZE / 2 + sampleZ * spacing]
}

export function sampleDensityGrid(shape, resolution) {
  const densities = new Float32Array(resolution ** 3)

  for (let sampleZ = 0; sampleZ < resolution; sampleZ += 1) {
    for (let sampleY = 0; sampleY < resolution; sampleY += 1) {
      for (let sampleX = 0; sampleX < resolution; sampleX += 1) {
        const [x, y, z] = samplePosition(resolution, sampleX, sampleY, sampleZ)
        densities[voxelIndex(resolution, sampleX, sampleY, sampleZ)] = sampleDensity(shape, x, y, z)
      }
    }
  }

  return densities
}

const NEIGHBOR_OFFSETS = [
  [-1, 0, 0], [1, 0, 0],
  [0, -1, 0], [0, 1, 0],
  [0, 0, -1], [0, 0, 1],
]

export function isSolid(densities, resolution, sampleX, sampleY, sampleZ) {
  // Below the volume counts as solid, so the floor is never drawn. Every other
  // side counts as open, which exposes the volume as a cut-away block.
  if (sampleY < 0) return true
  const isOutside =
    sampleX < 0 || sampleX >= resolution ||
    sampleY >= resolution ||
    sampleZ < 0 || sampleZ >= resolution
  if (isOutside) return false
  return densities[voxelIndex(resolution, sampleX, sampleY, sampleZ)] < ISOVALUE
}

// The solid voxels that touch open space. Voxels buried inside the solid cannot
// be seen, so they are skipped. Returns the flat sample indices.
export function findSurfaceVoxels(densities, resolution) {
  const surface = []

  for (let sampleZ = 0; sampleZ < resolution; sampleZ += 1) {
    for (let sampleY = 0; sampleY < resolution; sampleY += 1) {
      for (let sampleX = 0; sampleX < resolution; sampleX += 1) {
        if (!isSolid(densities, resolution, sampleX, sampleY, sampleZ)) continue

        const isExposed = NEIGHBOR_OFFSETS.some(([offsetX, offsetY, offsetZ]) =>
          !isSolid(densities, resolution, sampleX + offsetX, sampleY + offsetY, sampleZ + offsetZ),
        )
        if (isExposed) surface.push(voxelIndex(resolution, sampleX, sampleY, sampleZ))
      }
    }
  }

  return surface
}

// A single cell is the cube between eight neighbouring samples. Corner k sits at
// x = k & 1, y = (k >> 1) & 1, z = (k >> 2) & 1, so the corners run 0 to 7.
export const CELL_CORNER_COUNT = 8

// Which corners are inside, for the patterns Step 06 shows.
export const CELL_CASES = {
  empty: [],
  single: [0],
  edge: [0, 1],
  face: [0, 1, 2, 3],
  three: [0, 1, 2],
  opposite: [0, 7],
}

// How far each corner is from zero. They differ, so the surface points land at
// different distances along their edges instead of always in the middle.
const CORNER_DISTANCES = [0.3, 0.7, 0.5, 0.25, 0.6, 0.35, 0.45, 0.8]

export function cellCornerOffset(corner) {
  return [corner & 1, (corner >> 1) & 1, (corner >> 2) & 1]
}

export function cellCornerValues(insideCorners) {
  return CORNER_DISTANCES.map((distance, corner) => (insideCorners.includes(corner) ? -distance : distance))
}

// One bit per corner, set when that corner is inside. Eight bits make a number
// from 0 to 255.
export function cellCaseIndex(cornerValues) {
  let caseIndex = 0
  cornerValues.forEach((value, corner) => {
    if (value < ISOVALUE) caseIndex += 2 ** corner
  })
  return caseIndex
}

// How far along the edge from corner A to corner B the value reaches zero.
export function crossingFraction(valueA, valueB) {
  return valueA / (valueA - valueB)
}

// The twelve edges: every pair of corners that differ in exactly one axis.
export function cellEdges() {
  const edges = []
  for (let corner = 0; corner < CELL_CORNER_COUNT; corner += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const bit = 1 << axis
      if ((corner & bit) === 0) edges.push([corner, corner | bit])
    }
  }
  return edges
}

function isEdgeCrossed(cornerValues, [cornerA, cornerB]) {
  return (cornerValues[cornerA] < ISOVALUE) !== (cornerValues[cornerB] < ISOVALUE)
}

function crossingPoint(cornerValues, [cornerA, cornerB]) {
  const fraction = crossingFraction(cornerValues[cornerA], cornerValues[cornerB])
  const offsetA = cellCornerOffset(cornerA)
  const offsetB = cellCornerOffset(cornerB)
  return offsetA.map((start, axis) => start + (offsetB[axis] - start) * fraction)
}

// One point on every edge whose two ends disagree, in cell units from 0 to 1.
export function findCrossingPoints(cornerValues) {
  return cellEdges()
    .filter((edge) => isEdgeCrossed(cornerValues, edge))
    .map((edge) => crossingPoint(cornerValues, edge))
}

// On every face of the cell, the surface joins the crossed edges with lines.
// Returns, for each crossed edge, the two crossed edges it is joined to.
function linkCrossedEdges(cornerValues) {
  const edges = cellEdges()
  const links = new Map()

  const link = (first, second) => {
    links.set(first, [...(links.get(first) ?? []), second])
    links.set(second, [...(links.get(second) ?? []), first])
  }

  for (let axis = 0; axis < 3; axis += 1) {
    for (const side of [0, 1]) {
      const isOnFace = (corner) => ((corner >> axis) & 1) === side
      const crossedOnFace = []
      edges.forEach((edge, edgeIndex) => {
        if (edge.every(isOnFace) && isEdgeCrossed(cornerValues, edge)) crossedOnFace.push(edgeIndex)
      })

      if (crossedOnFace.length === 2) link(...crossedOnFace)

      // Opposite corners of a face are inside and the other two are outside, so
      // all four edges are crossed and two pairings are possible. Cutting off
      // each inside corner on its own is one valid choice. It depends only on
      // this face, so the cell on the other side of it makes the same choice and
      // the two pieces of surface meet without a crack.
      if (crossedOnFace.length === 4) {
        for (let corner = 0; corner < CELL_CORNER_COUNT; corner += 1) {
          if (!isOnFace(corner) || cornerValues[corner] >= ISOVALUE) continue
          link(...crossedOnFace.filter((edgeIndex) => edges[edgeIndex].includes(corner)))
        }
      }
    }
  }

  return links
}

// The surface of a cell as triangles, each a triple of crossed-edge indices.
// Only which corners are inside matters, not how far they are from zero. The
// joining lines close into loops, and each loop is filled like a fan.
export function findSurfaceEdgeTriangles(cornerValues) {
  const links = linkCrossedEdges(cornerValues)
  const visited = new Set()
  const triangles = []

  for (const start of links.keys()) {
    if (visited.has(start)) continue

    const loop = []
    let current = start
    while (current !== undefined) {
      visited.add(current)
      loop.push(current)
      current = links.get(current).find((edgeIndex) => !visited.has(edgeIndex))
    }

    for (let index = 1; index < loop.length - 1; index += 1) {
      triangles.push([loop[0], loop[index], loop[index + 1]])
    }
  }

  return triangles
}

// The same triangles as points, in cell units from 0 to 1.
export function findSurfaceTriangles(cornerValues) {
  const edges = cellEdges()
  return findSurfaceEdgeTriangles(cornerValues).map((triangle) =>
    triangle.map((edgeIndex) => crossingPoint(cornerValues, edges[edgeIndex])),
  )
}
