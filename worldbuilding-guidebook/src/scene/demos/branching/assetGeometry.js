// Tubes for the solid look: each segment is a short open cylinder with one ring
// of vertices at each end. The index never changes for a given segment count
// and side count, so a growing asset only rewrites positions.
export const TUBE_TAPER = 0.8

export function tubeIndex(segmentCount, sides) {
  const indices = new Uint32Array(segmentCount * sides * 6)
  let cursor = 0
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const base = segment * sides * 2
    for (let side = 0; side < sides; side += 1) {
      const next = (side + 1) % sides
      indices.set([base + side, base + sides + side, base + next, base + next, base + sides + side, base + sides + next], cursor)
      cursor += 6
    }
  }
  return indices
}

export function triangleCount(index) {
  return index.length / 3
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const normalize = (v) => {
  const size = Math.hypot(...v) || 1
  return [v[0] / size, v[1] / size, v[2] / size]
}

// Writes the two rings of every segment. A segment of zero length collapses to
// a point, so a piece that has not grown yet draws nothing.
export function writeTubes(positions, segments, sides) {
  segments.forEach(({ from, to, radiusStart, radiusEnd }, index) => {
    const direction = normalize([to[0] - from[0], to[1] - from[1], to[2] - from[2]])
    const reference = Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
    const across = normalize(cross(direction, reference))
    const up = cross(direction, across)
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2
      const cosine = Math.cos(angle)
      const sine = Math.sin(angle)
      for (const [ring, centre, radius] of [[0, from, radiusStart], [1, to, radiusEnd]]) {
        const offset = (index * sides * 2 + ring * sides + side) * 3
        for (let axis = 0; axis < 3; axis += 1) {
          positions[offset + axis] = centre[axis] + (across[axis] * cosine + up[axis] * sine) * radius
        }
      }
    }
  })
}

// Tube radii for a list of asset segments: the far end is a little thinner.
export function tubeSegments(segments) {
  return segments.map((segment) => ({ ...segment, radiusStart: segment.radius, radiusEnd: segment.radius * TUBE_TAPER }))
}

export function skeletonPositions(segments) {
  const positions = new Float32Array(segments.length * 6)
  segments.forEach(({ from, to }, index) => positions.set([...from, ...to], index * 6))
  return positions
}
