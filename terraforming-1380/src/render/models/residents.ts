import {
  Box3, BoxGeometry, BufferAttribute, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh,
  MeshStandardMaterial, OctahedronGeometry, Raycaster, SphereGeometry, Vector3, type BufferGeometry, type Material,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { palette } from '../../config/palette'
import { residentSpecies, type ResidentKind } from '../../content/residents'

// D-059: the nine resident bodies tuned in docs/ares9-residents.html, ported to the game. Each body is generated from
// a seed, so every individual differs. Models are built in model units (a Facet Pebble is about one unit across) with
// the origin on the ground under the body and the eyes facing +Z; ResidentsView scales and places them.

const { rock, strata, accent } = palette.resident

/** Blends from 0 to 1. tuck: legs in, body sitting on the ground. shut: eyes closed and the hiding gesture (door,
 *  collapse, stalk in). peek: looking around. shake: startled trembling. walk: stepping. */
export interface ResidentPose { tuck: number; shut: number; peek: number; shake: number; walk: number }

export interface ResidentModel {
  object: Group
  /** Height of the tucked, hidden body above the origin, in model units. */
  top: number
  /** Height of the eyes above the origin while tucked with eyes open, in model units. */
  eyeLine: number
  /** Height of the highest eye rim in the same pose, in model units. */
  eyeTop: number
  /** Peeking raises only an eye stalk; the body stays at lurking depth. */
  stalkPeek: boolean
  /** Eases toward `target`; `gait` scales the stepping rate. */
  update(target: ResidentPose, seconds: number, delta: number, gait: number): void
  dispose(): void
}

// Materials shared by every resident on screen. Geometry belongs to each model.
export function createResidentKit() {
  const solids = new Map<string, MeshStandardMaterial>()
  const kit = {
    rock: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }),
    rockDouble: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, side: DoubleSide }),
    limb: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7 }),
    white: new MeshStandardMaterial({ color: accent.eyeWhite, roughness: 0.4 }),
    ink: new MeshStandardMaterial({ color: accent.eyeInk, roughness: 0.35 }),
    solid(color: string, soft = false) {
      const key = color + soft
      let material = solids.get(key)
      if (!material) solids.set(key, material = new MeshStandardMaterial({ color, roughness: soft ? 0.55 : 0.8, flatShading: !soft }))
      return material
    },
    dispose() {
      for (const material of [kit.rock, kit.rockDouble, kit.limb, kit.white, kit.ink, ...solids.values()]) material.dispose()
      solids.clear()
    },
  }
  return kit
}
export type ResidentKit = ReturnType<typeof createResidentKit>

// ─── small utilities ───
const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const smooth = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t) }

function random(seed: number) {
  let a = seed >>> 0
  const f = () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    f,
    range: (lo: number, hi: number) => lo + (hi - lo) * f(),
    int: (lo: number, hi: number) => lo + Math.floor(f() * (hi - lo + 1)),
    pick: <T>(list: readonly T[]) => list[Math.floor(f() * list.length)],
    chance: (p: number) => f() < p,
  }
}
type Rng = ReturnType<typeof random>
type Tones = readonly string[]

function shade(hex: string, dl: number) {
  const color = new Color(hex)
  color.offsetHSL(0, 0, dl)
  return '#' + color.getHexString()
}

// The species' first rock family is its default, so it comes up twice as often.
function tones(r: Rng, kind: ResidentKind): Tones {
  const families = residentSpecies[kind].rockFamilies
  return rock[r.pick([families[0], ...families])]
}

// ─── procedural rock geometry ───
// Displace every unique vertex once (keyed by position) so faceted rocks stay watertight.
function roughen(source: BufferGeometry, r: Rng, { radial = 0, offset = 0, transform }: { radial?: number; offset?: number; transform?: (v: Vector3) => void } = {}) {
  const g = source.index ? source.toNonIndexed() : source
  if (g !== source) source.dispose()
  if (g.attributes.uv) g.deleteAttribute('uv')
  const pos = g.attributes.position
  const cache = new Map<string, { s: number; o: Vector3 }>()
  const v = V()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const key = Math.round(v.x * 1000) + ',' + Math.round(v.y * 1000) + ',' + Math.round(v.z * 1000)
    let d = cache.get(key)
    if (!d) {
      d = { s: 1 + (r.f() * 2 - 1) * radial, o: V(r.f() * 2 - 1, r.f() * 2 - 1, r.f() * 2 - 1).multiplyScalar(offset) }
      cache.set(key, d)
    }
    v.multiplyScalar(d.s).add(d.o)
    transform?.(v)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

// One color per triangle, chosen by a rule that sees the face centroid and normal (moss on top, strata by height…).
type ColorRule = (center: Vector3, normal: Vector3, r: Rng) => string
function paint(g: BufferGeometry, r: Rng, rule: ColorRule, jitter = 0.05) {
  const pos = g.attributes.position, n = pos.count, colors = new Float32Array(n * 3)
  const a = V(), b = V(), c = V(), e1 = V(), e2 = V(), normal = V(), center = V(), tone = new Color()
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2)
    normal.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize()
    center.copy(a).add(b).add(c).divideScalar(3)
    tone.set(rule(center, normal, r))
    tone.offsetHSL(0, 0, (r.f() - 0.5) * jitter)
    for (let k = 0; k < 3; k++) colors.set([tone.r, tone.g, tone.b], (i + k) * 3)
  }
  g.setAttribute('color', new BufferAttribute(colors, 3))
  return g
}
const fromTones = (list: Tones): ColorRule => (_c, _n, r) => r.pick(list)
const mossy = (base: ColorRule, threshold: number, list: Tones = rock.moss): ColorRule =>
  (c, n, r) => (n.y > threshold + (r.f() - 0.5) * 0.3 ? r.pick(list) : base(c, n, r))
const banded = (bands: readonly Tones[], band: number, offset: number): ColorRule => (c, _n, r) => {
  const i = Math.floor((c.y + offset + (r.f() - 0.5) * band * 0.35) / band)
  return r.pick(bands[((i % bands.length) + bands.length) % bands.length])
}

interface RockOptions { radius?: number; detail?: number; radial?: number; offset?: number; scale?: readonly number[]; flat?: number; color: ColorRule }
function rockGeometry(r: Rng, { radius = 0.5, detail = 1, radial = 0.1, offset = 0.02, scale = [1, 1, 1], flat = -0.7, color }: RockOptions) {
  const floor = flat * radius * scale[1]
  const g = roughen(new IcosahedronGeometry(radius, detail), r, {
    radial, offset: offset * radius,
    transform: v => { v.x *= scale[0]; v.y *= scale[1]; v.z *= scale[2]; if (v.y < floor) v.y = floor + (v.y - floor) * 0.12 },
  })
  return paint(g, r, color)
}
const boundsOf = (mesh: Mesh) => new Box3().setFromBufferAttribute(mesh.geometry.attributes.position as BufferAttribute)

// ─── rig: eyes and limbs ───
interface Eye { object: Group; lid: Group; pupil: Mesh | null; r: number; rest: Vector3 | null }
interface Leg { pivot: Group; phase: number }
interface Arm { pivot: Group; side: number; base: number }
interface Rig {
  kit: ResidentKit; root: Group; torso: Group; eyes: Eye[]; legs: Leg[]; arms: Arm[]; own: Material[]
  legLen: number; hipY: number; bodyMinY: number; sitY?: number; stalkPeek: boolean
  hook?: (s: ResidentPose, time: number) => void
}

const ray = new Raycaster()
function hit(mesh: Mesh, from: Vector3, direction: Vector3) {
  mesh.updateMatrixWorld(true)
  ray.set(from, direction.clone().normalize())
  const found = ray.intersectObject(mesh, false)[0]
  return found?.face ? { p: found.point.clone(), n: found.face.normal.clone() } : null
}
function disc(r: number, segments: number, material: Material, depth: number) {
  const g = new CylinderGeometry(r, r, depth, segments)
  g.rotateX(Math.PI / 2)
  return new Mesh(g, material)
}
type EyeType = 'dot' | 'disc' | 'octa'
function makeEye(kit: ResidentKit, type: EyeType, r: number): Eye {
  const object = new Group(), lid = new Group()
  object.add(lid)
  let pupil: Mesh | null = null
  if (type === 'dot') {
    const dot = new Mesh(new SphereGeometry(r, 12, 8), kit.ink)
    dot.scale.set(1, 1.2, 0.6)
    lid.add(dot)
  } else if (type === 'disc') {
    lid.add(disc(r, 18, kit.white, 0.024))
    pupil = disc(r * 0.56, 16, kit.ink, 0.02)
    pupil.position.z = 0.012
    lid.add(pupil)
    const glint = disc(r * 0.17, 10, kit.white, 0.01)
    glint.position.set(r * 0.18, r * 0.2, 0.012)
    pupil.add(glint)
  } else {
    const ring = disc(r * 1.24, 8, kit.ink, 0.02)
    ring.rotation.z = Math.PI / 8
    lid.add(ring)
    const white = disc(r, 8, kit.white, 0.03)
    white.rotation.z = Math.PI / 8
    white.position.z = 0.008
    lid.add(white)
    pupil = disc(r * 0.44, 4, kit.ink, 0.02)
    pupil.position.z = 0.024
    lid.add(pupil)
  }
  return { object, lid, pupil, r, rest: null }
}
function placeOn(object: Group, mesh: Mesh, x: number, y: number, push: number, bias = 0.4) {
  const h = hit(mesh, V(x, y, 5), V(0, 0, -1))
  if (!h) { object.position.set(x, y, 0.3); mesh.add(object); return }
  const n = h.n.clone().lerp(V(0, 0, 1), bias).normalize()
  object.position.copy(h.p).addScaledVector(n, push)
  object.quaternion.setFromUnitVectors(V(0, 0, 1), n)
  mesh.add(object)
}
function addEyes(rig: Rig, mesh: Mesh, { type, r, spacing = 0, y, count = 2, push, bias }:
  { type: EyeType; r: number; spacing?: number; y: number; count?: number; push?: number; bias?: number }) {
  const xs = count === 1 ? [0] : [-spacing / 2, spacing / 2]
  for (const x of xs) {
    const eye = makeEye(rig.kit, type, r)
    placeOn(eye.object, mesh, x, y, push ?? (type === 'dot' ? 0 : 0.008), bias)
    rig.eyes.push(eye)
  }
}
// A limb hangs along -Y from its pivot; vertex colors fade from `top` to `bottom` (the mint tips of the Sentinel).
function limb(kit: ResidentKit, length: number, r: number, top: string, bottom = top, { segments = 6, foot = null as string | null } = {}) {
  const g = new CylinderGeometry(r * 0.85, r, length, segments, 3)
  g.translate(0, -length / 2, 0)
  const pos = g.attributes.position, colors = new Float32Array(pos.count * 3)
  const a = new Color(top), b = new Color(bottom), t = new Color()
  for (let i = 0; i < pos.count; i++) {
    t.copy(a).lerp(b, smooth(-pos.getY(i) / length))
    colors.set([t.r, t.g, t.b], i * 3)
  }
  g.setAttribute('color', new BufferAttribute(colors, 3))
  const pivot = new Group()
  pivot.add(new Mesh(g, kit.limb))
  if (foot) {
    const shoe = new Mesh(new SphereGeometry(r * 1.7, 8, 6), kit.solid(foot))
    shoe.scale.set(1, 0.55, 1.5)
    shoe.position.set(0, -length, r * 0.8)
    pivot.add(shoe)
  }
  return pivot
}
function addLegs(rig: Rig, mesh: Mesh, { count = 2, length, r, top, bottom = top, sx, sz = 0, foot = null }:
  { count?: 2 | 4; length: number; r: number; top: string; bottom?: string; sx: number; sz?: number; foot?: string | null }) {
  const bounds = boundsOf(mesh), hipY = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.14
  const spots = count === 2 ? [[-sx, 0, 0], [sx, 0, Math.PI]]
    : [[-sx, -sz, 0], [sx, -sz, Math.PI], [-sx, sz, Math.PI], [sx, sz, 0]]
  for (const [x, z, phase] of spots) {
    const pivot = limb(rig.kit, length, r, top, bottom, { foot })
    pivot.position.set(x, hipY, z)
    rig.torso.add(pivot)
    rig.legs.push({ pivot, phase })
  }
  rig.legLen = length; rig.hipY = hipY; rig.bodyMinY = bounds.min.y
}
function addArms(rig: Rig, mesh: Mesh, { length, r, color, y, angle = 0.5, z = 0 }:
  { length: number; r: number; color: string; y: number; angle?: number; z?: number }) {
  for (const side of [-1, 1]) {
    const h = hit(mesh, V(side * 5, y, z), V(-side, 0, 0))
    if (!h) continue
    const pivot = limb(rig.kit, length, r, color)
    pivot.position.copy(h.p).addScaledVector(h.n, -0.012)
    mesh.add(pivot)
    rig.arms.push({ pivot, side, base: angle })
  }
}

// ─── the nine species ───
type Build = (rig: Rig, r: Rng) => void
const builds: Record<ResidentKind, Build> = {
  facet(rig, r) {
    const R = r.range(0.46, 0.58), list = tones(r, 'facet')
    const body = new Mesh(rockGeometry(r, { radius: R, detail: 1, radial: r.range(0.07, 0.13), offset: 0.03,
      scale: [r.range(1.08, 1.25), r.range(0.85, 1), r.range(0.85, 0.98)], flat: -0.72, color: fromTones(list) }), rig.kit.rock)
    addEyes(rig, body, { type: 'disc', r: R * r.range(0.13, 0.16), spacing: R * r.range(0.6, 0.8), y: R * r.range(-0.02, 0.16) })
    addArms(rig, body, { length: r.range(0.26, 0.34), r: 0.022, color: accent.graphite, y: -R * 0.08, angle: 0.55 })
    rig.torso.add(body)
    addLegs(rig, body, { length: r.range(0.3, 0.4), r: 0.026, top: accent.graphite, sx: R * 0.32, foot: accent.graphite })
  },
  moss(rig, r) {
    const R = r.range(0.42, 0.54), list = tones(r, 'moss')
    const body = new Mesh(rockGeometry(r, { radius: R, detail: 2, radial: r.range(0.035, 0.07), offset: 0.02,
      scale: [1.05, r.range(0.92, 1.12), 0.95], flat: -0.6, color: mossy(fromTones(list), r.range(0.38, 0.66)) }), rig.kit.rock)
    addEyes(rig, body, { type: 'dot', r: 0.03, spacing: R * r.range(0.42, 0.55), y: -R * r.range(0.05, 0.25) })
    let sprout: Group | null = null
    const crown = r.chance(0.8) ? hit(body, V(r.range(-0.15, 0.15) * R, 5, r.range(-0.15, 0.15) * R), V(0, -1, 0)) : null
    if (crown) {
      sprout = new Group()
      sprout.position.copy(crown.p)
      body.add(sprout)
      const L = r.range(0.1, 0.18)
      sprout.add(new Mesh(new CylinderGeometry(0.008, 0.012, L, 5).translate(0, L / 2, 0), rig.kit.solid(accent.sprout)))
      for (const s of [-1, 1]) {
        const leaf = new Mesh(new SphereGeometry(0.045, 6, 4), rig.kit.solid(r.pick(accent.leaf)))
        leaf.scale.set(1.4, 0.35, 0.8)
        leaf.position.set(s * 0.05, L, 0)
        leaf.rotation.z = s * 0.4
        sprout.add(leaf)
      }
      if (r.chance(0.35)) {
        const flower = new Mesh(new OctahedronGeometry(0.035), rig.kit.solid(accent.flower))
        flower.position.y = L + 0.02
        sprout.add(flower)
      }
    }
    rig.torso.add(body)
    addLegs(rig, body, { count: 4, length: 0.13, r: 0.06, top: shade(list[0], -0.08), sx: R * 0.48, sz: R * 0.32 })
    rig.hook = (s, T) => {
      if (!sprout) return
      sprout.rotation.z = Math.sin(T * 1.8) * 0.12 + s.shake * Math.sin(T * 40) * 0.2
      sprout.scale.setScalar(1 - s.shut * 0.35)
    }
  },
  slab(rig, r) {
    const W = r.range(0.42, 0.54), H = r.range(0.95, 1.2), D = r.range(0.28, 0.36), slant = r.range(-0.25, 0.25), taper = r.range(0.05, 0.2)
    const bands = r.pick([strata.rose, strata.sand, strata.slate])
    const g = roughen(new BoxGeometry(W, H, D, 2, 5, 2), r, { offset: 0.022, transform: v => {
      const k = (v.y + H / 2) / H
      v.x *= 1 - taper * k
      v.z *= 1 - taper * 0.5 * k
      if (v.y > H / 2 - 0.06) v.y += v.x * slant
    } })
    paint(g, r, banded(bands, r.range(0.09, 0.14), r.f()))
    const body = new Mesh(g, rig.kit.rock), limbColor = shade(bands[1][0], -0.12)
    addEyes(rig, body, { type: 'dot', r: 0.028, spacing: W * 0.36, y: H * r.range(0.12, 0.26) })
    addArms(rig, body, { length: 0.13, r: 0.04, color: limbColor, y: -H * 0.08, angle: 0.35 })
    rig.torso.add(body)
    addLegs(rig, body, { length: r.range(0.1, 0.15), r: 0.05, top: limbColor, sx: W * 0.24 })
  },
  crystal(rig, r) {
    const R = r.range(0.4, 0.5), list = tones(r, 'crystal')
    const body = new Mesh(rockGeometry(r, { radius: R, detail: 1, radial: 0.1, offset: 0.03, scale: [1.12, 0.75, 0.95], flat: -0.6, color: fromTones(list) }), rig.kit.rock)
    const tint = r.pick(accent.crystal)
    const glow = new MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.15, roughness: 0.2, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.9 })
    rig.own.push(glow)
    const count = r.int(4, 7)
    for (let i = 0; i < count; i++) {
      const a = r.f() * Math.PI * 2, d = r.f() * R * 0.55
      const h = hit(body, V(Math.cos(a) * d, 5, Math.sin(a) * d * 0.8 - R * 0.1), V(0, -1, 0))
      if (!h) continue
      const length = r.range(0.22, 0.55) * (1 - (d / R) * 0.6), rad = r.range(0.045, 0.085)
      const prism = new CylinderGeometry(rad, rad, length, 6).translate(0, length / 2, 0)
      const tip = new CylinderGeometry(0, rad, rad * 1.8, 6).translate(0, length + rad * 0.9, 0)
      const spike = new Mesh(mergeGeometries([prism, tip]), glow)
      prism.dispose(); tip.dispose()
      spike.position.copy(h.p).addScaledVector(h.n, -0.03)
      const up = h.n.clone().multiplyScalar(0.8).add(V(r.range(-0.3, 0.3), 1, r.range(-0.3, 0.3))).normalize()
      spike.quaternion.setFromUnitVectors(V(0, 1, 0), up)
      spike.rotateY(r.f() * Math.PI)
      body.add(spike)
    }
    addEyes(rig, body, { type: 'dot', r: 0.032, spacing: R * 0.55, y: -R * 0.12 })
    rig.torso.add(body)
    addLegs(rig, body, { count: 4, length: 0.13, r: 0.05, top: shade(list[0], -0.1), sx: R * 0.5, sz: R * 0.3 })
    // The crystals glint while it looks around and flicker while it trembles.
    rig.hook = (s, T) => {
      glow.emissiveIntensity = 0.12 + 0.08 * Math.sin(T * 2.2) + s.peek * 0.25 + s.shake * (0.5 + 0.5 * Math.sin(T * 18))
    }
  },
  sentinel(rig, r) {
    const H = r.range(0.68, 0.9), Rr = r.range(0.36, 0.44), list = tones(r, 'sentinel')
    const base = new CylinderGeometry(Rr * 0.86, Rr, H, 8, 2)
    base.rotateY(Math.PI / 8)
    const g = roughen(base, r, { offset: 0.018, transform: v => { v.z *= 0.78 } })
    paint(g, r, fromTones(list), 0.04)
    const body = new Mesh(g, rig.kit.rock)
    addEyes(rig, body, { type: 'octa', r: Rr * r.range(0.42, 0.52), count: 1, y: H * r.range(0, 0.12), push: 0.012, bias: 1 })
    const tendrils: { pivot: Group; base: number }[] = []
    const k = r.int(2, 3)
    for (let i = 0; i < k; i++) {
      const angle = k === 2 ? (i ? 0.55 : -0.55) : (i - 1) * 0.6
      const pivot = limb(rig.kit, r.range(0.3, 0.5), 0.02, list[0], accent.mint, { segments: 5 })
      pivot.position.set(-Math.sin(angle) * Rr * 0.3, H / 2 - 0.02, 0)
      pivot.rotation.z = Math.PI + angle
      body.add(pivot)
      tendrils.push({ pivot, base: Math.PI + angle })
    }
    rig.torso.add(body)
    addLegs(rig, body, { length: r.range(0.32, 0.42), r: 0.03, top: shade(list[0], -0.05), bottom: accent.mint, sx: Rr * 0.38 })
    rig.hook = (s, T) => tendrils.forEach(({ pivot, base }, i) => {
      pivot.rotation.z = base + Math.sin(T * 2 + i * 1.7) * 0.08 + s.shake * Math.sin(T * 35 + i) * 0.15
      const out = Math.max(0.001, 1 - s.shut)
      pivot.scale.set(1, out, 1)
      pivot.visible = out > 0.02
    })
  },
  hermit(rig, r) {
    const R = r.range(0.5, 0.6), list = tones(r, 'hermit')
    const g = roughen(new SphereGeometry(R, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.66), r, { radial: 0.08, offset: 0.02 * R })
    g.rotateX(-0.5)
    paint(g, r, mossy(fromTones(list), 0.75))
    const shell = new Mesh(g, rig.kit.rockDouble)
    const shellBounds = new Box3().setFromBufferAttribute(g.attributes.position as BufferAttribute)
    const softGeometry = new SphereGeometry(R * 0.6, 16, 12)
    softGeometry.scale(1, 0.72, 1.05)
    const soft = new Mesh(softGeometry, rig.kit.solid(r.pick(accent.softBody), true))
    const softColor = '#' + (soft.material as MeshStandardMaterial).color.getHexString()
    addEyes(rig, soft, { type: 'disc', r: 0.06, spacing: 0.17, y: R * 0.1 })
    soft.position.set(0, shellBounds.min.y + R * 0.22, R * 0.2)
    const softRest = soft.position.clone()
    rig.torso.add(shell, soft)
    const softMin = soft.position.y - R * 0.6 * 0.72, hipY = softMin + 0.05, length = 0.17
    ;[[-0.17, 0.05], [0.17, 0.05], [-0.21, -0.12], [0.21, -0.12], [-0.15, 0.22], [0.15, 0.22]].forEach(([x, z], i) => {
      const pivot = limb(rig.kit, length, 0.022, shade(softColor, -0.1), shade(softColor, -0.22))
      pivot.position.set(x * R / 0.55, hipY, z * R / 0.55 + soft.position.z * 0.6)
      rig.torso.add(pivot)
      rig.legs.push({ pivot, phase: i % 2 ? Math.PI : 0 })
    })
    rig.legLen = length; rig.hipY = hipY; rig.bodyMinY = Math.min(shellBounds.min.y, softMin)
    rig.sitY = -shellBounds.min.y - 0.02
    // The door stone waits beside the opening and rolls shut when the soft body pulls in.
    const door = new Mesh(rockGeometry(r, { radius: 0.15, detail: 0, radial: 0.1, scale: [1, 0.85, 0.7], flat: -0.8, color: fromTones(list) }), rig.kit.rock)
    rig.root.add(door)
    const doorOpen = V(R + 0.35, 0.11, 0.25), doorShut = V(0, 0.12, R * 0.7)
    rig.hook = s => {
      const h = s.shut
      soft.position.set(softRest.x, softRest.y + h * R * 0.38, softRest.z - h * R * 0.3)
      soft.scale.setScalar(1 - h * 0.3)
      const k = smooth((h - 0.4) / 0.6)
      door.position.lerpVectors(doorOpen, doorShut, k)
      door.rotation.set(0, k * 0.3, (1 - k) * -3)
    }
  },
  cairn(rig, r) {
    const pool = residentSpecies.cairn.rockFamilies.map(family => rock[family] as Tones)
    const lists = [0, 1, 2].map(() => pool.splice(Math.floor(r.f() * pool.length), 1)[0])
    const sizes = [r.range(0.4, 0.48), r.range(0.3, 0.36), r.range(0.21, 0.26)]
    const stones = sizes.map((size, i) => new Mesh(rockGeometry(r, { radius: size, detail: 1, radial: 0.1, offset: 0.03,
      scale: [1.15, r.range(0.58, 0.7), 1], flat: -0.5, color: fromTones(lists[i]) }), rig.kit.rock))
    const eye: EyeType = r.chance(0.5) ? 'dot' : 'disc'
    addEyes(rig, stones[2], { type: eye, r: eye === 'dot' ? 0.028 : 0.045, spacing: sizes[2] * 0.75, y: 0 })
    addArms(rig, stones[1], { length: 0.24, r: 0.02, color: accent.graphite, y: 0, angle: 0.6 })
    const rest: Vector3[] = []
    let top = 0, parent = V()
    stones.forEach((stone, i) => {
      const bounds = boundsOf(stone)
      const at = i === 0 ? V() : V(r.range(-0.06, 0.06), top - bounds.min.y - 0.035, r.range(-0.04, 0.04))
      stone.position.copy(at).sub(parent)
      if (i === 2) stone.rotation.y = r.range(-0.25, 0.25)
      rest.push(stone.position.clone())
      ;(i === 0 ? rig.torso : stones[i - 1]).add(stone)
      top = at.y + bounds.max.y
      parent = at
    })
    addLegs(rig, stones[0], { length: r.range(0.24, 0.3), r: 0.03, top: accent.graphite, sx: sizes[0] * 0.35, foot: accent.graphite })
    // Stacked stones sway out of step while walking and slump sideways into a pile when hiding.
    rig.hook = (s, T) => stones.forEach((stone, i) => {
      if (!i) return
      const dir = i === 1 ? 1 : -1
      stone.position.x = rest[i].x + s.shut * dir * 0.1
      stone.position.y = rest[i].y - s.shut * 0.05 * i
      stone.rotation.z = s.shut * dir * -0.25 + s.walk * Math.sin(T * 9 - i * 0.8) * 0.08 + s.shake * Math.sin(T * 42 + i) * 0.05
        + s.peek * Math.sin(T * 1.6) * 0.07
    })
  },
  periscope(rig, r) {
    const R = r.range(0.5, 0.62), list = tones(r, 'periscope')
    const body = new Mesh(rockGeometry(r, { radius: R, detail: 1, radial: 0.1, offset: 0.03, scale: [1.2, r.range(0.42, 0.52), 1],
      flat: -0.45, color: mossy(fromTones(list), 0.82) }), rig.kit.rock)
    const stalks: { stalk: Mesh; eye: Eye; L: number; phase: number }[] = []
    const n = r.chance(0.35) ? 2 : 1
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? r.range(-0.1, 0.1) * R : (i ? 0.26 : -0.26) * R
      const h = hit(body, V(x, 5, R * 0.15), V(0, -1, 0))
      if (!h) continue
      const base = new Group()
      base.position.copy(h.p)
      base.position.y -= 0.02
      body.add(base)
      const L = r.range(0.32, 0.5) * (i ? 0.8 : 1)
      const stalk = new Mesh(new CylinderGeometry(0.026, 0.034, 1, 6).translate(0, 0.5, 0), rig.kit.solid(shade(list[0], 0.1)))
      base.add(stalk)
      const object = new Group(), lid = new Group()
      object.add(lid)
      lid.add(new Mesh(new SphereGeometry(0.1, 14, 10), rig.kit.white))
      const pupil = disc(0.05, 14, rig.kit.ink, 0.02)
      pupil.position.z = 0.095
      lid.add(pupil)
      const eye: Eye = { object, lid, pupil, r: 0.1, rest: null }
      base.add(object)
      rig.eyes.push(eye)
      stalks.push({ stalk, eye, L, phase: r.f() * 6 })
    }
    rig.torso.add(body)
    addLegs(rig, body, { count: 4, length: 0.08, r: 0.045, top: shade(list[0], -0.1), sx: R * 0.55, sz: R * 0.3 })
    rig.stalkPeek = true
    rig.hook = (s, T) => {
      for (const st of stalks) {
        const f = (lerp(0.55, 1.35, s.peek) + 0.06 * Math.sin(T * 1.3 + st.phase) + s.shake * 0.15) * (1 - s.shut)
        const length = Math.max(0.001, st.L * f)
        st.stalk.scale.y = length
        st.stalk.visible = length > 0.01
        st.eye.object.position.y = length + 0.07
        st.eye.object.scale.setScalar(Math.max(0.001, clamp01(f * 2.5)))
        st.eye.object.rotation.y = s.peek * Math.sin(T * 1.4 + st.phase) * 0.9 + (1 - s.peek) * Math.sin(T * 0.5 + st.phase) * 0.25
      }
    }
  },
  shard(rig, r) {
    const H = r.range(1.0, 1.3), Rb = r.range(0.32, 0.4), lean = r.range(-0.22, 0.22), list = tones(r, 'shard')
    const cone = new ConeGeometry(Rb, H, 5, 3)
    cone.rotateY(Math.PI / 5)
    const g = roughen(cone, r, { offset: 0.03, transform: v => { v.z *= 0.8; v.x += (v.y + H / 2) * lean } })
    paint(g, r, (center, _n, rr) => (center.y > H * 0.05 && rr.f() < center.y / H + 0.2 ? rr.pick(rock.moss) : rr.pick(list)))
    const body = new Mesh(g, rig.kit.rock)
    addEyes(rig, body, { type: 'dot', r: 0.03, spacing: Rb * 0.55, y: -H * 0.24 })
    addArms(rig, body, { length: 0.15, r: 0.02, color: accent.graphite, y: -H * 0.3, angle: 0.7 })
    rig.torso.add(body)
    addLegs(rig, body, { length: r.range(0.2, 0.28), r: 0.026, top: accent.graphite, sx: Rb * 0.38, foot: accent.graphite })
  },
}

// ─── model ───
export function createResidentModel(kind: ResidentKind, seed: number, kit: ResidentKit): ResidentModel {
  const r = random(seed)
  const rig: Rig = { kit, root: new Group(), torso: new Group(), eyes: [], legs: [], arms: [], own: [], legLen: 0, hipY: 0, bodyMinY: 0, stalkPeek: false }
  rig.root.name = `resident-${kind}`
  rig.root.add(rig.torso)
  builds[kind](rig, r)
  const standY = rig.legLen - rig.hipY
  const sitY = rig.sitY ?? -rig.bodyMinY - 0.03
  for (const eye of rig.eyes) eye.rest = eye.pupil?.position.clone() ?? null
  const s: ResidentPose = { tuck: 0, shut: 0, peek: 0, shake: 0, walk: 0 }
  const phase = r.f() * 100
  let blinkAt = r.range(0.5, 3), blinkOn = -9, stride = 0

  function apply(time: number) {
    const T = time + phase, step = stride
    const breathe = Math.sin(T * 2.1) * 0.012 * (1 - s.shut)
    const { torso } = rig
    torso.position.y = lerp(standY, sitY, s.tuck) + breathe + s.walk * Math.abs(Math.sin(step)) * 0.05
    torso.position.x = s.shake * Math.sin(T * 55) * 0.018
    torso.rotation.z = s.peek * Math.sin(T * 1.7) * 0.14 + s.walk * Math.sin(step) * 0.05
    torso.rotation.x = s.peek * 0.12 + s.walk * 0.06
    torso.scale.y = 1 + breathe * 0.8 - s.shake * 0.03
    const legOut = Math.max(0.001, 1 - s.tuck)
    for (const { pivot, phase: legPhase } of rig.legs) {
      pivot.scale.y = legOut
      pivot.visible = legOut > 0.03
      pivot.rotation.x = s.walk * Math.sin(step + legPhase) * 0.55
    }
    const armOut = Math.max(0.001, 1 - s.shut)
    for (const { pivot, side, base } of rig.arms) {
      pivot.scale.setScalar(armOut)
      pivot.visible = s.shut < 0.97
      pivot.rotation.z = side * (base + s.shake * 1.7 + Math.sin(T * 1.3) * 0.06)
      pivot.rotation.x = s.walk * Math.sin(step + (side > 0 ? 0 : Math.PI)) * 0.6
    }
    if (time > blinkAt) { blinkOn = time; blinkAt = time + r.range(2, 5.5) }
    const blink = time - blinkOn < 0.13 ? 0.08 : 1
    const open = (1 - smooth((s.shut - 0.5) * 2)) * blink
    const look = s.peek * Math.sin(T * 2.3) * 0.9 + (1 - s.peek) * Math.sin(T * 0.4) * 0.3
    for (const { lid, pupil, r: size, rest } of rig.eyes) {
      lid.scale.set(1 + s.shake * 0.2, Math.max(0.05, open * (1 + s.shake * 0.25)), 1)
      if (pupil && rest) {
        pupil.position.x = rest.x + look * size * 0.3
        pupil.position.y = rest.y - s.peek * size * 0.08
        pupil.visible = open > 0.3
      }
    }
    rig.hook?.(s, T)
  }

  // Measure the tucked body: its top while hidden, and its eye line with the eyes open.
  const measure = (pose: Partial<ResidentPose>) => {
    Object.assign(s, { tuck: 1, shut: 0, peek: 0, shake: 0, walk: 0 }, pose)
    apply(-phase)
    rig.root.updateMatrixWorld(true)
  }
  measure({})
  const eyeLine = Math.max(0, ...rig.eyes.map(eye => eye.object.getWorldPosition(V()).y))
  // The rim of the largest eye (a Sentinel's ring reaches 1.24 radii) is what must stay under ground while lurking.
  const eyeTop = Math.max(0, ...rig.eyes.map(eye => eye.object.getWorldPosition(V()).y + eye.r * 1.3))
  measure({ shut: 1 })
  const top = new Box3().setFromObject(rig.torso).max.y
  rig.root.traverse(object => { if (object instanceof Mesh) object.raycast = () => {} })

  return {
    object: rig.root, top, eyeLine, eyeTop, stalkPeek: rig.stalkPeek,
    update(target, seconds, delta, gait) {
      const a = 1 - Math.exp(-delta * 5)
      s.tuck += (target.tuck - s.tuck) * a
      s.shut += (target.shut - s.shut) * a
      s.peek += (target.peek - s.peek) * a
      s.shake += (target.shake - s.shake) * a
      s.walk += (target.walk - s.walk) * a
      stride += delta * 9 * gait * Math.max(s.walk, 0.0001)
      apply(seconds)
    },
    dispose() {
      rig.root.traverse(object => { if (object instanceof Mesh) object.geometry.dispose() })
      rig.own.forEach(material => material.dispose())
      rig.root.removeFromParent()
    },
  }
}
