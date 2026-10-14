import { CylinderGeometry, OctahedronGeometry, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { palette } from '../../config/palette'
import { hashSeed } from '../../world/planet'
import { randomStream } from '../../world/resourceClusters'

// D-027: geometry templates for things on (or in) the ground. Local +Y is the outward surface normal and the
// origin is the ground point. Each template is a list of merged geometries keyed by palette color, so the
// views can draw every copy with one instanced mesh per color.
export interface ColoredGeometry { color: string; geometry: BufferGeometry }

function byColor(parts: ColoredGeometry[]): ColoredGeometry[] {
  const groups = new Map<string, BufferGeometry[]>()
  for (const { color, geometry } of parts) groups.set(color, [...(groups.get(color) ?? []), geometry])
  return [...groups].map(([color, geometries]) => {
    const geometry = mergeGeometries(geometries)
    geometries.forEach((part) => part.dispose())
    return { color, geometry }
  })
}

function rod(from: Vector3, to: Vector3, radius: number) {
  const direction = to.clone().sub(from)
  return new CylinderGeometry(radius, radius, direction.length(), 6)
    .applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()))
    .translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)
}

// Vegetation A: flat, low-saturation lichen discs (0.02–0.06) clustered around three centers.
export function lichenGeometries(key: string, spread = 0.22, count = 40) {
  const random = randomStream(hashSeed(`${key}:lichen`))
  const centers = Array.from({ length: 3 }, () => [(random() - 0.5) * spread, (random() - 0.5) * spread])
  const lichen = palette.vegetation.lichen
  return byColor(Array.from({ length: count }, (_, i) => {
    const [cx, cz] = centers[i % 3]
    const offset = () => (random() + random() + random() - 1.5) * spread * 0.32
    const size = 0.02 + random() * random() * 0.045
    const color = lichen[Math.floor(random() * random() * lichen.length)]
    const geometry = new SphereGeometry(1, 12, 6).scale(size, size * 0.14, size * (0.6 + random() * 0.4))
      .rotateY(random() * 3).translate(cx + offset(), 0.001, cz + offset())
    return { color, geometry }
  }))
}

// Vegetation D: an L-system branch (four levels, 2–3 children). `growth` 0–1 keeps only the lower levels,
// so young plants are bare stems and only full-grown ones carry tips.
export function branchGeometries(key: string, height = 0.24, growth = 1) {
  const random = randomStream(hashSeed(`${key}:branch`))
  const parts: ColoredGeometry[] = []
  const maxLevel = growth * 6
  const grow = (from: Vector3, direction: Vector3, length: number, depth: number, level: number) => {
    const to = from.clone().addScaledVector(direction, length)
    if (level <= maxLevel) parts.push({ color: palette.vegetation.stem, geometry: rod(from, to, 0.0012 + 0.0011 * depth) })
    if (depth === 0) {
      const color = random() > 0.3 ? palette.vegetation.tip : palette.vegetation.lichen[1]
      if (level + 1 <= maxLevel) parts.push({ color, geometry: new SphereGeometry(0.0065, 8, 6).translate(to.x, to.y, to.z) })
      return
    }
    for (let i = 0; i < (depth > 2 ? 2 : 3); i += 1) {
      const next = direction.clone()
        .applyAxisAngle(new Vector3(1, 0, 0), (random() - 0.5) * 1.1)
        .applyAxisAngle(new Vector3(0, 1, 0), random() * Math.PI * 2)
        .lerp(new Vector3(0, 1, 0), 0.25).normalize()
      grow(to, next, length * (0.62 + random() * 0.12), depth - 1, level + 1)
    }
  }
  grow(new Vector3(), new Vector3(0, 1, 0), height * 0.36, 4, 0)
  return byColor(parts)
}

// Antenna A: a 0.45 three-leg lattice mast on a triangular pad, with a small dish and a lamp.
export type AntennaPart = 'pad' | 'frame' | 'dish' | 'lamp'
export function antennaGeometries(height = 0.45): Record<AntennaPart, BufferGeometry> {
  const leg = (i: number, y: number) => {
    const angle = (i * Math.PI * 2) / 3
    const radius = 0.06 + (0.012 - 0.06) * (y / height)
    return new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
  }
  const frame: BufferGeometry[] = []
  const steps = 9
  for (let step = 0; step < steps; step += 1) {
    const y0 = (height * step) / steps
    const y1 = (height * (step + 1)) / steps
    for (let i = 0; i < 3; i += 1) {
      frame.push(rod(leg(i, y0), leg(i, y1), 0.0035))
      frame.push(rod(leg(i, y0), leg((i + 1) % 3, y1), 0.0016))
      frame.push(rod(leg(i, y1), leg((i + 1) % 3, y1), 0.0016))
    }
  }
  frame.push(rod(new Vector3(0, height, 0), new Vector3(0, height + 0.06, 0.02), 0.002))
  const merged = mergeGeometries(frame)
  frame.forEach((part) => part.dispose())
  return {
    pad: new CylinderGeometry(0.085, 0.095, 0.02, 3),
    frame: merged,
    dish: new SphereGeometry(0.055, 24, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38)
      .rotateX(-0.5).translate(0, height + 0.045, 0),
    lamp: new SphereGeometry(0.009, 10, 8).translate(0, height + 0.065, 0.022),
  }
}

export const antennaColors: Record<AntennaPart, string> = {
  pad: palette.robot.body,
  frame: palette.antenna.frame,
  dish: palette.antenna.dish,
  lamp: palette.antenna.lamp,
}

// Resource B: a mineral deposit drawn as `count` crystals (radius 0.035–0.07 at scale 1) inside an envelope.
// Visual only; the target is still one seeded point (D-023), so callers scale the cluster to the target radius.
export function crystalClusterGeometry(key: string, count = 5, envelope = 0.28) {
  const random = randomStream(hashSeed(`${key}:crystals`))
  const crystals = Array.from({ length: count }, () => {
    const position = new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize()
      .multiplyScalar(envelope * Math.cbrt(random()))
    const radius = 0.035 + random() * 0.035
    return new OctahedronGeometry(1, 0).scale(radius, radius * (1.8 + random() * 0.8), radius)
      .rotateX(random() * 3).rotateY(random() * 3).rotateZ(random() * 3)
      .translate(position.x, position.y, position.z)
  })
  const geometry = mergeGeometries(crystals)
  crystals.forEach((part) => part.dispose())
  geometry.computeBoundingSphere()
  return geometry
}
