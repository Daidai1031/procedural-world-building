import { Matrix4, Quaternion, Vector3 } from 'three'
import { createRandom } from './random.js'
import { SCATTER_WORLD_SIZE, heightAt } from './terrain.js'

// Candidates stay this far inside the edge, so a rock never hangs over a wall.
const FOOTPRINT_SIZE = 0.94 * SCATTER_WORLD_SIZE

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
