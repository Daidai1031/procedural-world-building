import { BackSide, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, Points, PointsMaterial, ShaderMaterial, SphereGeometry, Vector3 } from 'three'
import { palette } from '../config/palette'
import { tuning } from '../config/tuning'
import { createPlanetField, hashSeed, planetConfig } from '../world/planet'
import { valueNoise3D, VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'

type Direction = [number, number, number]

function randomStream(seed: number) {
  let state = seed
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Seeded initial surface radius along a direction, found the same way resource targets are placed.
export function createSurfaceRadius(seed: string) {
  const field = createPlanetField(seed)
  return ([x, y, z]: Direction) => {
    let inside = 0
    let outside = VOXEL_WORLD_SIZE / 2
    for (let step = 0; step < 14; step += 1) {
      const middle = (inside + outside) / 2
      if (field(x * middle, y * middle + VOXEL_WORLD_SIZE / 2, z * middle) < 0) inside = middle
      else outside = middle
    }
    return inside
  }
}

function randomDirection(random: () => number): Direction {
  for (;;) {
    const x = random() * 2 - 1
    const y = random() * 2 - 1
    const z = random() * 2 - 1
    const length = Math.hypot(x, y, z)
    if (length <= 1 && length > 0.1) return [x / length, y / length, z / length]
  }
}

// D-027 atmosphere C4 ("hugs the terrain + clumps"): point height starts at the terrain below it, dust
// density follows low-frequency noise but never drops below a sparse floor, and two shells drift at
// different speeds. Positions are relative to the planet center.
export function buildAtmospherePoints(seed: string, surfaceRadius = createSurfaceRadius(seed)) {
  const settings = tuning.visual.atmosphere
  const random = randomStream(hashSeed(`${seed}:atmosphere`))
  const inner: number[] = []
  const outer: number[] = []
  let attempts = 0
  while (inner.length + outer.length < settings.points * 3 && attempts < settings.points * 40) {
    attempts += 1
    const direction = randomDirection(random)
    const density = valueNoise3D(direction[0] * 2 + 7, direction[1] * 2, direction[2] * 2 + 3, hashSeed(`${seed}:dust`))
    if (random() > settings.floorChance + (1 - settings.floorChance) * smooth(0.4, 0.66, density)) continue
    const ground = surfaceRadius(direction)
    const height = -Math.log(1 - random() * 0.97) * (settings.falloff.base + settings.falloff.dense * density)
    const radius = ground + settings.lift + height
    ;(height < 0.16 ? inner : outer).push(direction[0] * radius, direction[1] * radius, direction[2] * radius)
  }
  return { inner: new Float32Array(inner), outer: new Float32Array(outer) }
}

function haloGeometry(seed: string, surfaceRadius: (direction: Direction) => number) {
  const geometry = new SphereGeometry(1, 72, 48)
  const position = geometry.attributes.position
  const base = VOXEL_WORLD_SIZE * planetConfig(seed).radius
  const noiseSeed = hashSeed(`${seed}:halo`)
  const v = new Vector3()
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i).normalize()
    const radius = base + 0.32 + (surfaceRadius([v.x, v.y, v.z]) - base) * 0.9
      + valueNoise3D(v.x * 1.8 + 3, v.y * 1.8, v.z * 1.8 + 1, noiseSeed) * 0.32
    position.setXYZ(i, v.x * radius, v.y * radius, v.z * radius)
  }
  geometry.computeVertexNormals()
  return geometry
}

// A faint, irregular back-face shell: opaque near the planet's limb, fading to nothing at its own edge.
function haloMaterial(color: Color, opacity: number) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: color }, uOpacity: { value: opacity } },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vToCamera;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vToCamera = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vToCamera;
      void main() {
        float depth = -dot(normalize(vNormalView), normalize(vToCamera));
        gl_FragColor = vec4(uColor, uOpacity * pow(smoothstep(0.0, 0.45, depth), 1.5));
      }`,
    side: BackSide,
    transparent: true,
    depthWrite: false,
  })
}

export function createAtmosphere(seed: string) {
  const settings = tuning.visual.atmosphere
  const surfaceRadius = createSurfaceRadius(seed)
  const { inner, outer } = buildAtmospherePoints(seed, surfaceRadius)
  const color = new Color(palette.atmosphere)
  const group = new Group()
  const layers = [inner, outer].map((positions) => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    const material = new PointsMaterial({ color, size: 2, sizeAttenuation: false, transparent: true,
      opacity: Math.min(1, 1.7 * settings.strength), depthWrite: false })
    const points = new Points(geometry, material)
    points.raycast = () => {}
    group.add(points)
    return points
  })
  const halo = new Mesh(haloGeometry(seed, surfaceRadius), haloMaterial(color, settings.strength * settings.haloOpacity))
  halo.raycast = () => {}
  group.add(halo)
  return {
    group,
    // Ambient drift only; the planet itself never rotates (VIEW-01).
    update(seconds: number) {
      layers[0].rotation.y = seconds * settings.drift.inner
      layers[1].rotation.y = seconds * settings.drift.outer
    },
    dispose() {
      group.traverse((object) => {
        if (object instanceof Points || object instanceof Mesh) {
          object.geometry.dispose()
          ;(object.material as PointsMaterial | ShaderMaterial).dispose()
        }
      })
    },
  }
}
