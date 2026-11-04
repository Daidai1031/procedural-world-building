import {
  BackSide, Color, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial,
  RingGeometry, ShaderMaterial, SphereGeometry, Vector3,
} from 'three'
import { palette } from '../config/palette'
import { hashSeed, planetConfig } from '../world/planet'
import { valueNoise3D } from '../world/voxels/voxelMath.js'
import type { SurfaceKind } from '../content/surfaces'

// D-074: a signal planet seen from orbit, drawn as the world it really is. Its colours come from its own surface
// material (D-060), its ground carries the same contour lines as the home planet, and the finer touches follow its seed:
// a thin shell of air, a ring on some, a moon on others.

interface Recipe { low: string; high: string; steep: string; contour: string; air: string; relief: number; roughness: number }
const recipes: Record<SurfaceKind, Recipe> = {
  rock: { low: palette.terrain.low, high: palette.terrain.high, steep: palette.terrain.steep, contour: palette.terrain.contour, air: '#a9b8c2', relief: 0.07, roughness: 0.9 },
  metal: { low: palette.surface.metal.low, high: palette.surface.metal.high, steep: palette.surface.metal.steep, contour: palette.surface.metal.contour, air: '#c3cfdc', relief: 0.05, roughness: 0.38 },
  plastic: { low: '#e29400', high: '#f8f1e4', steep: '#c4200e', contour: palette.surface.plastic.contour, air: '#ffd9a0', relief: 0.03, roughness: 0.55 },
  fur: { low: palette.surface.fur.low, high: palette.surface.fur.high, steep: palette.surface.fur.steep, contour: palette.surface.fur.contour, air: '#f1d6b0', relief: 0.06, roughness: 1 },
  jelly: { low: palette.surface.jelly.low, high: palette.surface.jelly.high, steep: palette.surface.jelly.steep, contour: palette.surface.jelly.contour, air: '#ffb7cb', relief: 0.035, roughness: 0.3 },
  ice: { low: palette.surface.ice.low, high: palette.surface.ice.high, steep: palette.surface.ice.steep, contour: palette.surface.ice.contour, air: '#9bd8f4', relief: 0.03, roughness: 0.22 },
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function bodyGeometry(seed: string, kind: SurfaceKind) {
  const recipe = recipes[kind]
  const geometry = new IcosahedronGeometry(1, 5)
  const noiseSeed = hashSeed(`${seed}:distant`)
  const low = new Color(recipe.low), high = new Color(recipe.high), steep = new Color(recipe.steep), contour = new Color(recipe.contour)
  const bands = palette.surface.plastic.bands.map(color => new Color(color))
  const position = geometry.attributes.position
  const colors: number[] = []
  const v = new Vector3(), c = new Color()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).normalize()
    const broad = valueNoise3D(v.x * 1.9 + 7, v.y * 1.9, v.z * 1.9 + 3, noiseSeed)
    const medium = valueNoise3D(v.x * 4.6, v.y * 4.6 + 5, v.z * 4.6, noiseSeed + 1)
    const fine = valueNoise3D(v.x * 11, v.y * 11, v.z * 11 + 9, noiseSeed + 2)
    const height = (broad * 4 + medium * 2 + fine) / 7
    const radius = 1 + recipe.relief * (height - 0.5) * 2
    position.setXYZ(i, v.x * radius, v.y * radius, v.z * radius)
    if (kind === 'plastic') {
      const band = Math.floor(((v.y * 0.5 + 0.5) * bands.length * 1.7 + medium * 1.6)) % bands.length
      c.copy(bands[band]).lerp(high, smooth(0.55, 0.8, fine) * 0.35)
    } else {
      c.copy(low).lerp(high, smooth(0.32, 0.72, height))
      c.lerp(steep, smooth(0.6, 0.85, fine) * 0.5)
      // The same thin contour lines the home planet carries, one line per height step.
      const step = Math.abs(((height * 9) % 1) - 0.5) * 2
      c.lerp(contour, (1 - smooth(0.0, 0.12, step)) * (kind === 'ice' || kind === 'jelly' ? 0.18 : 0.3))
      if (kind === 'ice') {
        c.lerp(new Color(palette.surface.ice.scar), smooth(0.78, 0.94, Math.abs(v.y)))
        c.lerp(contour, (1 - smooth(0, 0.025, Math.abs(medium - 0.5))) * 0.55)
      }
    }
    colors.push(c.r, c.g, c.b)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

const glowShader = (color: string) => new ShaderMaterial({
  uniforms: { uColor: { value: new Color(color) }, uStrength: { value: 0 } },
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
    uniform float uStrength;
    varying vec3 vNormalView;
    varying vec3 vToCamera;
    void main() {
      float facing = abs(dot(normalize(vNormalView), normalize(vToCamera)));
      // Seen from behind the planet: brightest at its limb, gone at the shell's own edge, hidden by the body in between.
      float rim = pow(smoothstep(0.0, 0.55, facing), 2.2);
      gl_FragColor = vec4(uColor, rim * uStrength);
      #include <colorspace_fragment>
    }`,
  transparent: true,
  depthWrite: false,
  side: BackSide,
})

const ringShader = (seed: number) => new ShaderMaterial({
  uniforms: { uFade: { value: 0 }, uSeed: { value: (seed % 997) / 97 } },
  vertexShader: `
    varying vec2 vPosition;
    void main() {
      vPosition = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform float uFade;
    uniform float uSeed;
    varying vec2 vPosition;
    void main() {
      float r = length(vPosition);
      float t = (r - 1.5) / 0.85;
      float bands = 0.5 + 0.5 * sin(r * 62.0 + uSeed) * sin(r * 23.0 - uSeed * 2.0);
      float gap = smoothstep(0.0, 0.05, abs(t - 0.62)) * smoothstep(0.0, 0.04, abs(t - 0.3));
      float edge = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.9, 1.0, t));
      float alpha = (0.25 + 0.55 * bands) * gap * edge * uFade;
      vec3 color = mix(vec3(0.72, 0.64, 0.52), vec3(0.93, 0.88, 0.78), bands);
      gl_FragColor = vec4(color * 0.9, alpha);
      #include <colorspace_fragment>
    }`,
  transparent: true,
  depthWrite: false,
  side: DoubleSide,
})

export interface DistantBody {
  group: Group
  body: Mesh
  /** 0..1: how far the planet has appeared. */
  setFade(amount: number): void
  /** Hovered planets glow a little more. */
  setLift(amount: number): void
  update(seconds: number, delta: number, still: boolean): void
  dispose(): void
}

export function createDistantBody(seed: string): DistantBody {
  const kind = planetConfig(seed).surface
  const recipe = recipes[kind]
  const hash = hashSeed(seed)
  const group = new Group()
  group.rotation.z = ((hash % 100) / 100 - 0.5) * 0.7
  const geometry = bodyGeometry(seed, kind)
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: recipe.roughness, metalness: kind === 'metal' ? 0.25 : 0, transparent: true, opacity: 0 })
  const body = new Mesh(geometry, material)
  group.add(body)

  const air = new Mesh(new SphereGeometry(1.22, 48, 32), glowShader(recipe.air))
  air.raycast = () => {}
  group.add(air)

  const hasRing = (hash >>> 5) % 3 === 0
  const ring = hasRing ? new Mesh(new RingGeometry(1.5, 2.35, 128, 1), ringShader(hash)) : null
  if (ring) {
    ring.rotation.x = Math.PI / 2 - 0.42
    ring.raycast = () => {}
    group.add(ring)
  }
  const hasMoon = (hash >>> 9) % 2 === 0
  const moon = hasMoon ? new Mesh(new IcosahedronGeometry(0.2, 3), new MeshStandardMaterial({ color: '#a8a49c', roughness: 0.95, flatShading: true, transparent: true, opacity: 0 })) : null
  if (moon) {
    moon.raycast = () => {}
    group.add(moon)
  }
  const moonPhase = (hash % 628) / 100
  let fade = 0, lift = 0
  const apply = () => {
    material.opacity = fade
    ;(air.material as ShaderMaterial).uniforms.uStrength.value = fade * (0.5 + 0.5 * lift)
    if (ring) (ring.material as ShaderMaterial).uniforms.uFade.value = fade
    if (moon) (moon.material as MeshStandardMaterial).opacity = fade
  }
  return {
    group, body,
    setFade(amount) { fade = amount; apply() },
    setLift(amount) { lift = amount; apply() },
    update(seconds, delta, still) {
      if (!still) body.rotation.y += delta * 0.08
      if (moon) {
        const angle = moonPhase + (still ? 0 : seconds * 0.12)
        moon.position.set(Math.cos(angle) * 2.0, Math.sin(angle * 0.7) * 0.35, Math.sin(angle) * 2.0)
        moon.visible = fade > 0
      }
    },
    dispose() {
      geometry.dispose(); material.dispose(); air.geometry.dispose(); (air.material as ShaderMaterial).dispose()
      if (ring) { ring.geometry.dispose(); (ring.material as ShaderMaterial).dispose() }
      if (moon) { moon.geometry.dispose(); (moon.material as MeshStandardMaterial).dispose() }
    },
  }
}
