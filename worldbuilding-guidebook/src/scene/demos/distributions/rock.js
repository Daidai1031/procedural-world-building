import { IcosahedronGeometry } from 'three'
import { valueNoise3D } from '../voxels/voxelMath.js'

export const ROCK_RADIUS = 0.13
const ROCK_FLATTEN = 0.62
const ROCK_LUMPINESS = 0.45
const ROCK_NOISE_FREQUENCY = 2.4
const ROCK_NOISE_SEED = 7
// How far the base sinks below its point. A rock on a slope would show a gap
// under its downhill side if its lowest vertex only touched the point.
const ROCK_SINK = 0.25

// One low-poly rock shared by every instance. Each vertex is pushed in or out
// by noise read at its own position, so the copies of a corner shared between
// faces move together and the surface has no cracks. The faces keep their own
// normals, which gives the faceted look.
export function buildRockGeometry() {
  const geometry = new IcosahedronGeometry(1, 1)
  const positions = geometry.getAttribute('position')

  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const x = positions.getX(vertex)
    const y = positions.getY(vertex)
    const z = positions.getZ(vertex)
    const noise = valueNoise3D(x * ROCK_NOISE_FREQUENCY, y * ROCK_NOISE_FREQUENCY, z * ROCK_NOISE_FREQUENCY, ROCK_NOISE_SEED)
    const radius = ROCK_RADIUS * (1 + (noise - 0.5) * ROCK_LUMPINESS)
    positions.setXYZ(vertex, x * radius, y * radius * ROCK_FLATTEN, z * radius)
  }

  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  geometry.translate(0, -min.y - (max.y - min.y) * ROCK_SINK, 0)
  geometry.computeVertexNormals()
  return geometry
}
