import {
  AnimationClip, BufferGeometry, CapsuleGeometry, CatmullRomCurve3, Curve, CylinderGeometry, Euler, Float32BufferAttribute,
  Group, LatheGeometry, Mesh, MeshStandardMaterial, Quaternion, QuaternionKeyframeTrack, SphereGeometry, TubeGeometry,
  Vector2, Vector3, VectorKeyframeTrack, type Material, type Object3D,
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { palette } from '../../config/palette'

// D-064: The Quiet Drifter, the player's traveller, built from the turnaround sheet "02 / The Quiet Drifter".
// Model units: one unit is one head, the body is 4.0 heads tall, the origin is on the ground between the boots and
// the face looks along +Z (the sheet's local axes: Y up, X right, Z forward). The rig is rigid parts parented at the
// sheet's joint pivots: ball shoulders and hips, hinge elbows, wrists, knees and ankles. Callers scale the object.

const C = palette.drifter

export const drifterJoints = [
  'hips', 'spine', 'neck', 'pack',
  'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR',
  'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR',
] as const
export type DrifterJoint = typeof drifterJoints[number]
type V3 = [number, number, number]

/** A full body pose. Joint rotations are XYZ Euler angles in radians in each joint's parent frame. `L` is the
 *  Drifter's own left, on +X. `lift` moves the hips; `blink` 0 is open, 1 shut; `gaze` shifts both eyes (x, y). */
export interface DrifterPose { joints: Record<DrifterJoint, V3>; lift: V3; blink: number; gaze: [number, number] }

export const drifterClipNames = ['idle', 'walk', 'look', 'wave', 'kneel', 'sit', 'jump', 'drift'] as const
export type DrifterClip = typeof drifterClipNames[number]

// ─── proportions, read off the front and side views (heads) ───
const HEIGHT = 4
const HIP = { x: 0.26, y: 1.42 }
const SHOULDER = { x: 0.75, y: 2.68 }
// The head turns about the dome's centre, so small nods stay hidden inside the collar.
const NECK_Y = 3.22
const THIGH = 0.62, SHIN = 0.46, UPPER = 0.6, FORE = 0.5
const HELMET = { r: 0.78, base: 3.22 }
// The face opening is an arch seen from the front: straight sides from `bottom` to `spring`, a half circle above.
const ARCH = { w: 0.355, bottom: 3.1, spring: 3.43 }
const RECESS = 0.07
const EYE = { x: 0.125, y: 3.47 }
const ROSE = { x: 0.22, y: 2.6 }

const helmetRadius = (y: number) => y <= HELMET.base ? HELMET.r : Math.sqrt(Math.max(0, HELMET.r ** 2 - (y - HELMET.base) ** 2))
function insideArch(x: number, y: number, grow = 0) {
  if (y < ARCH.bottom - grow) return false
  if (y <= ARCH.spring) return Math.abs(x) <= ARCH.w + grow
  return x * x + (y - ARCH.spring) ** 2 <= (ARCH.w + grow) ** 2
}
const torsoProfile: [number, number][] = [
  [0, 1.22], [0.3, 1.25], [0.6, 1.32], [0.8, 1.45], [0.9, 1.62], [0.92, 1.8], [0.89, 2.02], [0.82, 2.28],
  [0.74, 2.52], [0.67, 2.74], [0.62, 2.88], [0.4, 2.93], [0, 2.94],
]
const TORSO_DEPTH = 0.82
function torsoRadius(y: number) {
  for (let i = 1; i < torsoProfile.length; i++) {
    const [r0, y0] = torsoProfile[i - 1], [r1, y1] = torsoProfile[i]
    if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0)
  }
  return 0
}

// ─── geometry helpers ───
// Smooth normals across lathe seams and poles, optionally after a scale.
function smooth(geometry: BufferGeometry, sx = 1, sy = 1, sz = 1) {
  geometry.deleteAttribute('normal')
  geometry.deleteAttribute('uv')
  const merged = mergeVertices(geometry, 1e-4)
  geometry.dispose()
  merged.scale(sx, sy, sz)
  merged.computeVertexNormals()
  return merged
}

// A lathe built quad by quad so the helmet can leave its face opening out. `keep` sees each quad's centre.
function latheGrid(profile: [number, number][], segments: number, keep: (x: number, y: number, z: number) => boolean) {
  const positions: number[] = [], index: number[] = []
  for (const [r, y] of profile) for (let j = 0; j < segments; j++) {
    const a = (j / segments) * Math.PI * 2
    positions.push(r * Math.sin(a), y, r * Math.cos(a))
  }
  const at = (k: number) => [positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]]
  for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < segments; j++) {
    const a = i * segments + j, b = i * segments + (j + 1) % segments
    const c = (i + 1) * segments + j, d = (i + 1) * segments + (j + 1) % segments
    const centre = [a, b, c, d].map(at).reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0])
    if (keep(centre[0], centre[1], centre[2])) index.push(a, b, c, b, d, c)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

// Cuffs, knee rings and the collar: a ring with rounded edges. Profile runs outer wall up, top in, inner wall down,
// bottom out, so LatheGeometry's normals face outward.
function roundedRing(inner: number, outer: number, height: number, corner: number, segments = 48) {
  const points: Vector2[] = []
  const arc = (cx: number, cy: number, from: number) => {
    for (let k = 0; k <= 5; k++) {
      const a = from + (k / 5) * (Math.PI / 2)
      points.push(new Vector2(cx + Math.cos(a) * corner, cy + Math.sin(a) * corner))
    }
  }
  const h = height / 2
  arc(outer - corner, -h + corner, -Math.PI / 2)
  arc(outer - corner, h - corner, 0)
  arc(inner + corner, h - corner, Math.PI / 2)
  arc(inner + corner, -h + corner, Math.PI)
  points.push(points[0].clone())
  return smooth(new LatheGeometry(points, segments))
}

class Spiral extends Curve<Vector3> {
  constructor() { super() }
  getPoint(t: number, target = new Vector3()) {
    const a = t * Math.PI * 3.3, r = 0.008 + 0.056 * t
    return target.set(Math.cos(a) * r, Math.sin(a) * r, 0.016 * (1 - t))
  }
}

function materials() {
  const make = (color: string, roughness: number, extra: Partial<MeshStandardMaterial> = {}) =>
    Object.assign(new MeshStandardMaterial({ color, roughness, metalness: 0 }), extra)
  return {
    ivory: make(C.ivory, 0.62),
    seam: make(C.seam, 0.7),
    cuff: make(C.cuff, 0.55),
    boot: make(C.boot, 0.8),
    face: make(C.face, 0.32),
    eye: make(C.eye, 0.3),
    rose: make(C.rose, 0.6),
    roseDeep: make(C.roseDeep, 0.6),
    leaf: make(C.leaf, 0.65),
    stem: make(C.stem, 0.7),
    pivot: make(C.cuff, 0.5, { depthTest: false, transparent: true, opacity: 0.95 }),
  }
}
type Kit = ReturnType<typeof materials>

function part(parent: Object3D, geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0, name?: string) {
  const mesh = new Mesh(geometry, material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  if (name) mesh.name = name
  parent.add(mesh)
  return mesh
}

function joint(parent: Group, name: DrifterJoint, x: number, y: number, z: number) {
  const group = new Group()
  group.name = 'drifter_' + name
  group.position.set(x, y, z)
  parent.add(group)
  return group
}

// ─── parts ───
function buildHelmet(neck: Group, kit: Kit) {
  // Positions below are written in body space, so the neck pivot's height is taken back out.
  const head = new Group()
  head.position.y = -NECK_Y
  neck.add(head)
  const profile: [number, number][] = [[0.7, 2.94], [0.75, 2.98], [0.775, 3.02]]
  for (let y = 3.05; y < HELMET.base; y += 0.03) profile.push([HELMET.r, y])
  for (let k = 0; k <= 44; k++) {
    const a = (k / 44) * (Math.PI / 2)
    profile.push([HELMET.r * Math.cos(a), HELMET.base + HELMET.r * Math.sin(a)])
  }
  part(head, latheGrid(profile, 128, (x, y, z) => !(z > 0 && insideArch(x, y))), kit.ivory, 0, 0, 0, 'helmet')
  // The opaque face inset, recessed behind the opening and a little larger than it.
  const inset: [number, number][] = []
  for (let y = ARCH.bottom - 0.12; y <= ARCH.spring + ARCH.w + 0.1; y += 0.025) inset.push([helmetRadius(y) - RECESS, y])
  part(head, latheGrid(inset, 128, (x, y, z) => z > 0 && insideArch(x, y, 0.08)), kit.face, 0, 0, 0, 'face')
  // A soft rim covers the opening's edge, as on the sheet's "helmet face (construction)".
  const rim: Vector3[] = []
  const onShell = (x: number, y: number) => new Vector3(x, y, Math.sqrt(Math.max(0, helmetRadius(y) ** 2 - x * x)) - 0.008)
  for (let y = 3.02; y < ARCH.spring; y += 0.05) rim.push(onShell(ARCH.w, y))
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI
    rim.push(onShell(Math.cos(a) * ARCH.w, ARCH.spring + Math.sin(a) * ARCH.w))
  }
  for (let y = ARCH.spring - 0.05; y >= 3.02; y -= 0.05) rim.push(onShell(-ARCH.w, y))
  part(head, new TubeGeometry(new CatmullRomCurve3(rim), 140, 0.042, 10, false), kit.ivory, 0, 0, 0, 'rim')
  // Two small eyes, set into the inset. The group carries gaze; each eye's height carries the blink.
  const eyes = new Group()
  eyes.name = 'drifter_eyes'
  head.add(eyes)
  const eyeGeometry = new SphereGeometry(0.058, 18, 12).scale(1, 1.08, 0.45)
  const eyeMeshes = [-1, 1].map((side) => {
    const r = helmetRadius(EYE.y) - RECESS
    const mesh = part(eyes, eyeGeometry, kit.eye, side * EYE.x, EYE.y, Math.sqrt(r * r - EYE.x ** 2) + 0.004)
    mesh.name = side < 0 ? 'eyeR' : 'eyeL'
    mesh.lookAt(new Vector3(side * EYE.x * 3, EYE.y, 10))
    return mesh
  })
  return { eyes, eyeMeshes }
}

function buildRose(spine: Group, kit: Kit) {
  const brooch = new Group()
  brooch.name = 'rose'
  const z = TORSO_DEPTH * Math.sqrt(torsoRadius(ROSE.y) ** 2 - ROSE.x ** 2)
  brooch.position.set(ROSE.x, ROSE.y - HIP.y, z + 0.035)
  brooch.rotation.set(-0.12, 0.2, 0)
  brooch.scale.setScalar(1.05)
  spine.add(brooch)
  // Five shallow, even petals, a spiral centre, a stem and two leaves.
  const petal = new SphereGeometry(0.085, 16, 12).scale(1, 0.95, 0.42)
  for (let k = 0; k < 5; k++) {
    const a = Math.PI / 2 + (k / 5) * Math.PI * 2
    const mesh = part(brooch, petal, kit.rose, Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0)
    mesh.rotation.set(-Math.sin(a) * 0.35, Math.cos(a) * 0.35, 0)
  }
  part(brooch, new CylinderGeometry(0.07, 0.075, 0.04, 20).rotateX(Math.PI / 2), kit.rose, 0, 0, 0.03)
  part(brooch, new TubeGeometry(new Spiral(), 72, 0.0135, 6, false), kit.roseDeep, 0, 0, 0.05)
  part(brooch, new CylinderGeometry(0.016, 0.016, 0.2, 8), kit.stem, 0, -0.18, 0.005)
  const leaf = new SphereGeometry(1, 14, 8).scale(0.085, 0.034, 0.022)
  for (const side of [-1, 1]) {
    const mesh = part(brooch, leaf, kit.leaf, side * 0.07, -0.205, 0.01)
    mesh.rotation.z = side * 0.5
  }
}

function buildArm(spine: Group, side: 1 | -1, kit: Kit) {
  const s = side > 0 ? 'L' : 'R'
  const shoulder = joint(spine, `shoulder${s}` as DrifterJoint, side * SHOULDER.x, SHOULDER.y - HIP.y, 0)
  part(shoulder, new CapsuleGeometry(0.15, 0.42, 8, 18), kit.ivory, 0, -0.29)
  const elbow = joint(shoulder, `elbow${s}` as DrifterJoint, 0, -UPPER, 0)
  part(elbow, new CapsuleGeometry(0.138, 0.32, 8, 18), kit.ivory, 0, -0.22)
  part(elbow, roundedRing(0.1, 0.172, 0.16, 0.04), kit.cuff, 0, -0.41)
  const wrist = joint(elbow, `wrist${s}` as DrifterJoint, 0, -FORE, 0)
  // A mitten: one rounded palm and a thumb on the side that faces forward and in.
  part(wrist, new SphereGeometry(0.175, 20, 14).scale(0.82, 1.15, 0.74), kit.ivory, 0, -0.15)
  part(wrist, new SphereGeometry(0.075, 12, 10).scale(1, 1.3, 1), kit.ivory, -side * 0.1, -0.1, 0.07)
}

function buildLeg(hips: Group, side: 1 | -1, kit: Kit) {
  const s = side > 0 ? 'L' : 'R'
  const hip = joint(hips, `hip${s}` as DrifterJoint, side * HIP.x, 0, 0)
  part(hip, new CapsuleGeometry(0.128, 0.46, 8, 16), kit.ivory, 0, -0.33)
  const knee = joint(hip, `knee${s}` as DrifterJoint, 0, -THIGH, 0)
  part(knee, roundedRing(0.0, 0.152, 0.085, 0.03), kit.ivory, 0, 0)
  part(knee, new CapsuleGeometry(0.118, 0.3, 8, 16), kit.ivory, 0, -0.25)
  const ankle = joint(knee, `ankle${s}` as DrifterJoint, 0, -SHIN, 0)
  // A rounded boot with a flat sole that reaches the ground in the rest pose.
  const boot = new SphereGeometry(1, 30, 20)
  const position = boot.attributes.position
  for (let i = 0; i < position.count; i++) if (position.getY(i) < -0.35) position.setY(i, -0.35)
  part(ankle, smooth(boot, 0.29, 0.32, 0.37), kit.boot, side * 0.06, -(HIP.y - THIGH - SHIN) + 0.35 * 0.32, 0.08)
}

function buildBody(kit: Kit) {
  const root = new Group()
  root.name = 'drifter'
  const hips = joint(root, 'hips', 0, HIP.y, 0)
  const spine = joint(hips, 'spine', 0, 0, 0)
  const torso = new LatheGeometry(torsoProfile.map(([r, y]) => new Vector2(r, y - HIP.y)), 56)
  part(spine, smooth(torso, 1, 1, TORSO_DEPTH), kit.ivory, 0, 0, 0, 'torso')
  part(spine, roundedRing(0.58, 0.86, 0.27, 0.075, 64), kit.ivory, 0, 2.975 - HIP.y, 0, 'collar')
  // The collar's front button: a dark ring around an ivory disc.
  const button = part(spine, new CylinderGeometry(0.068, 0.068, 0.05, 20).rotateX(Math.PI / 2), kit.ivory, 0, 2.975 - HIP.y, 0.855)
  part(button, roundedRing(0.062, 0.082, 0.04, 0.012, 24).rotateX(Math.PI / 2), kit.face, 0, 0, 0.012)
  const neck = joint(spine, 'neck', 0, NECK_Y - HIP.y, 0)
  const face = buildHelmet(neck, kit)
  buildRose(spine, kit)
  // A single cylinder with domed ends, hung from its top so it can swing a little behind the walk.
  const pack = joint(spine, 'pack', 0, 2.84 - HIP.y, -0.62)
  part(pack, new CapsuleGeometry(0.31, 0.66, 10, 24), kit.ivory, 0, -0.62, -0.32, 'backpack')
  for (const y of [-0.3, -0.94]) {
    part(pack, roundedRing(0.0, 0.322, 0.028, 0.012, 32), kit.seam, 0, y, -0.32)
  }
  part(pack, new CapsuleGeometry(0.07, 0.28, 6, 10).rotateX(Math.PI / 2), kit.seam, 0, -0.2, -0.08)
  for (const side of [1, -1] as const) { buildArm(spine, side, kit); buildLeg(hips, side, kit) }
  return { root, face }
}

// ─── poses ───
export function restPose(): DrifterPose {
  const joints = {} as Record<DrifterJoint, V3>
  for (const name of drifterJoints) joints[name] = [0, 0, 0]
  return { joints, lift: [0, 0, 0], blink: 0, gaze: [0, 0] }
}

const TAU = Math.PI * 2
const pos = (v: number) => Math.max(0, v)
const ease = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t) }
// A sine that lingers at its extremes: for glances that settle rather than swing.
const dwell = (a: number) => Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.45)

/** Writes a limb joint. Values are authored for the left side; the right side mirrors yaw and roll. */
function limb(p: DrifterPose, side: 'L' | 'R', name: 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle', x = 0, y = 0, z = 0) {
  const m = side === 'L' ? 1 : -1
  p.joints[`${name}${side}` as DrifterJoint] = [x, y * m, z * m]
}

// The sheet's front view: arms hang a little out from the body, elbows soft.
function stance(p: DrifterPose, breathe = 0) {
  for (const side of ['L', 'R'] as const) {
    limb(p, side, 'shoulder', 0.02, 0.05, 0.25 + 0.015 * breathe)
    limb(p, side, 'elbow', -0.14, 0, 0)
    limb(p, side, 'wrist', 0, 0, -0.06)
  }
  p.joints.spine = [0.015 * breathe, 0, 0]
  p.lift = [0, 0.006 * breathe, 0]
  return p
}

// A smooth periodic bump centred on `centre` (radians); larger `k` makes it narrower.
const bump = (phase: number, centre: number, k: number) => Math.exp(k * (Math.cos(phase - centre) - 1))
const SOLE = { depth: HIP.y - THIGH - SHIN, toe: 0.4, heel: 0.2 }

/** One leg of the walk at `phase`: the hip swings forward on sin(phase) > 0, the heel strikes at π/2 and the toe
 *  leaves at 3π/2. `reach` is how far below the hip pivot the boot's lowest point is. */
export function walkLeg(phase: number, a: number) {
  // A rounded triangle, not a sine: the standing foot then slides back at an almost even pace, matching the ground.
  const hip = -0.5 * a * Math.asin(0.85 * Math.sin(phase)) / Math.asin(0.85)
  // Bends most early in the swing, a little as the heel takes the weight, and stays nearly straight in between.
  const knee = 0.06 + a * (0.95 * bump(phase, -1.05, 2.2) + 0.14 * bump(phase, 2.1, 6))
  // Where the boot points: toe up at heel strike, flat while standing, heel up to push off, toe clear in the swing.
  const foot = a * (0.5 * bump(phase, -1.75, 7) - 0.22 * bump(phase, 1.45, 7) - 0.1 * bump(phase, 0.1, 2.5))
  const ankle = foot - hip - knee
  const sole = SOLE.depth * Math.cos(foot) + (foot > 0 ? SOLE.toe : SOLE.heel) * Math.abs(Math.sin(foot))
  const reach = THIGH * Math.cos(hip) + SHIN * Math.cos(hip + knee) + sole
  const ahead = THIGH * Math.sin(-hip) + SHIN * Math.sin(-hip - knee)
  return { hip, knee, ankle, reach, ahead }
}

/** Ground covered by one full walk cycle at amount `a`: the planted ankle travels from front to back twice. */
export function walkStride(a: number) {
  return 2 * (walkLeg(Math.PI / 2, a).ahead - walkLeg(-Math.PI / 2, a).ahead)
}

export interface ClipInfo { label: string; duration: number; fade: number; note: string }
/** Every clip loops on its own duration, so baked loops have no seam. */
export const drifterClipInfo: Record<DrifterClip, ClipInfo> = {
  idle: { label: 'Idle', duration: 6, fade: 0.35, note: 'Breathes, shifts weight, glances.' },
  walk: { label: 'Walk', duration: 1, fade: 0.25, note: 'Heel to toe, hips riding on the standing leg; steps follow the ground covered.' },
  look: { label: 'Look around', duration: 8, fade: 0.5, note: 'Slow, settling glances left and right, a little up.' },
  wave: { label: 'Wave', duration: 2, fade: 0.3, note: 'Right arm up, forearm waves twice per loop.' },
  kneel: { label: 'Kneel', duration: 5, fade: 0.6, note: 'Right knee down, right hand to the soil, looking at the ground.' },
  sit: { label: 'Sit and watch', duration: 8, fade: 0.9, note: 'Legs out, leaning back on both hands, watching the sky.' },
  jump: { label: 'Jump', duration: 0.7, fade: 0.12, note: 'A crouch, a hop clear of the ground, and a landing. Plays once.' },
  drift: { label: 'Drift', duration: 10, fade: 0.8, note: 'Weightless: floats, turns slowly, limbs loose.' },
}

/** Pure pose for `clip` at `time` seconds. `amount` scales the walk's stride (0 still, 1 full). */
export function drifterPose(clip: DrifterClip, time: number, amount = 1): DrifterPose {
  const p = restPose()
  const T = drifterClipInfo[clip].duration
  const w = (TAU * (((time % T) + T) % T)) / T
  const breathe = Math.sin(w * Math.round(T / 3))
  switch (clip) {
    case 'idle': {
      stance(p, breathe)
      p.joints.hips = [0, 0, 0.025 * Math.sin(w)]
      p.joints.spine = [0.02 + 0.015 * breathe, 0.03 * Math.sin(w), -0.02 * Math.sin(w)]
      p.joints.neck = [-0.03 + 0.03 * Math.sin(2 * w), 0.16 * dwell(w + 0.8), 0.04 * Math.sin(w + 0.8)]
      limb(p, 'L', 'hip', 0, 0, -0.025 * Math.sin(w)); limb(p, 'R', 'hip', 0, 0, 0.025 * Math.sin(w))
      limb(p, 'L', 'knee', 0.03 + 0.03 * pos(-Math.sin(w))); limb(p, 'R', 'knee', 0.03 + 0.03 * pos(Math.sin(w)))
      limb(p, 'L', 'shoulder', 0.04 * Math.sin(w), 0.05, 0.25 + 0.015 * breathe)
      limb(p, 'R', 'shoulder', -0.04 * Math.sin(w), 0.05, 0.25 + 0.015 * breathe)
      p.lift = [0.02 * Math.sin(w), 0.006 * breathe, 0]
      p.gaze = [0.03 * dwell(w + 0.8), 0]
      break
    }
    case 'walk': {
      const a = Math.max(0, Math.min(1.3, amount))
      const legs = (['L', 'R'] as const).map((side, index) => {
        const leg = walkLeg(w + index * Math.PI, a)
        limb(p, side, 'hip', leg.hip, 0, 0.03)
        limb(p, side, 'knee', leg.knee)
        limb(p, side, 'ankle', leg.ankle)
        return leg
      })
      // The hips ride exactly as high as the longer leg reaches, so the planted boot stays on the ground and the
      // body dips at each footfall and rises over the standing leg without a separate bob.
      const reach = Math.max(...legs.map((leg) => leg.reach))
      const sway = Math.cos(w), twist = Math.sin(w)
      p.lift = [-0.025 * a * sway, reach - HIP.y, 0]
      // Pelvis turns with the leading leg and drops on the swinging side; the chest turns against it.
      p.joints.hips = [0, -0.09 * a * twist, -0.045 * a * sway]
      p.joints.spine = [0.05 * a + 0.05 * pos(a - 1) + 0.02 * a * Math.cos(2 * w), 0.15 * a * twist, 0.03 * a * sway]
      p.joints.neck = [-0.02, -0.06 * a * twist, 0.015 * a * sway]
      for (const [side, phase] of [['L', w], ['R', w + Math.PI]] as const) {
        const arm = Math.sin(phase - 0.25)
        limb(p, side, 'shoulder', 0.36 * a * arm, 0.04, 0.24 + 0.02 * a)
        limb(p, side, 'elbow', -0.2 - 0.32 * a * pos(-arm))
        limb(p, side, 'wrist', 0.08 * a * arm, 0, -0.08)
      }
      break
    }
    case 'look': {
      stance(p, breathe)
      const glance = dwell(w), up = Math.sin(2 * w + 0.4)
      p.joints.neck = [-0.1 - 0.07 * up, 0.62 * glance, 0.08 * glance]
      p.joints.spine = [-0.04 - 0.03 * up, 0.2 * glance, -0.02 * glance]
      p.joints.hips = [0, 0.06 * glance, 0.02 * Math.sin(w)]
      limb(p, 'L', 'hip', 0, 0, -0.03 * glance); limb(p, 'R', 'hip', 0, 0, 0.03 * glance)
      limb(p, 'L', 'knee', 0.05 + 0.05 * pos(-glance)); limb(p, 'R', 'knee', 0.05 + 0.05 * pos(glance))
      p.lift = [0.03 * glance, 0.006 * breathe - 0.01, 0]
      p.gaze = [0.045 * glance, 0.02 * (0.5 + 0.5 * up)]
      break
    }
    case 'wave': {
      stance(p, breathe)
      const flick = Math.sin(2 * w)
      limb(p, 'R', 'shoulder', -0.25, -0.2, 2.35 + 0.05 * Math.sin(w))
      limb(p, 'R', 'elbow', -0.2, 0, 0.6 + 0.42 * flick)
      limb(p, 'R', 'wrist', 0.1, 0, -0.2 * flick)
      p.joints.neck = [-0.06, -0.12, -0.12 + 0.04 * flick]
      p.joints.spine = [0, -0.06, 0.07]
      p.joints.hips = [0, 0, 0.03]
      p.lift = [0.03, 0.012 * Math.abs(Math.sin(2 * w)), 0]
      limb(p, 'L', 'hip', 0, 0, -0.03); limb(p, 'R', 'knee', 0.07)
      break
    }
    case 'kneel': {
      // Solved so the left sole and the right knee rest on the ground (checked in tests/drifter.test.ts).
      p.lift = [0, -0.655 + 0.006 * breathe, -0.04]
      p.joints.hips = [0, 0.12, 0]
      limb(p, 'L', 'hip', -1.655, 0.05, 0.08)
      limb(p, 'L', 'knee', 1.665)
      limb(p, 'L', 'ankle', -0.02)
      limb(p, 'R', 'hip', 0.12, 0, 0.06)
      limb(p, 'R', 'knee', 1.66)
      limb(p, 'R', 'ankle', 0.62)
      p.joints.spine = [0.62 + 0.015 * breathe, -0.1, 0]
      p.joints.neck = [0.16 + 0.03 * Math.sin(w), -0.12 + 0.14 * dwell(w), 0]
      limb(p, 'R', 'shoulder', -0.95, 0, -0.1)
      limb(p, 'R', 'elbow', -0.1 - 0.08 * pos(Math.sin(2 * w)))
      limb(p, 'R', 'wrist', 0.4, 0, 0)
      limb(p, 'L', 'shoulder', -0.55, 0.1, 0.2)
      limb(p, 'L', 'elbow', -1.2)
      limb(p, 'L', 'wrist', 0.3)
      p.gaze = [0.02 * dwell(w), -0.04]
      break
    }
    case 'sit': {
      // Legs out, leaning back on both hands, watching the sky. Solved so seat, heels and palms touch the ground.
      const rock = Math.sin(w)
      p.lift = [0, -1.1, -0.2]
      p.joints.hips = [0, 0, 0.03 * rock]
      for (const side of ['L', 'R'] as const) {
        limb(p, side, 'hip', -1.51, 0, 0.1)
        limb(p, side, 'knee', 0.16)
        limb(p, side, 'shoulder', 0.55, 0, 0.1)
        limb(p, side, 'elbow', -0.03)
        limb(p, side, 'wrist', -0.6)
      }
      // Feet tap slowly, one after the other.
      limb(p, 'L', 'ankle', -0.65 - 0.2 * pos(Math.sin(2 * w)))
      limb(p, 'R', 'ankle', -0.65 - 0.2 * pos(-Math.sin(2 * w)))
      p.joints.spine = [-0.5 + 0.015 * breathe, 0, -0.03 * rock]
      p.joints.neck = [-0.2 + 0.03 * Math.sin(2 * w), 0.2 * dwell(w + 1), 0.05 * rock]
      p.gaze = [0.02 * dwell(w + 1), 0.07]
      break
    }
    case 'jump': {
      // air is 0 on the ground at both ends and 1 at the top; crouch gathers in the quarters between, so the loop seams.
      const air = Math.sin(w / 2) ** 2
      const crouch = Math.sin(w) ** 2 * (1 - air)
      stance(p, 0)
      const tuck = 0.85 * air
      p.lift = [0.03 * crouch, -0.38 * crouch + 1.45 * air, 0]
      p.joints.hips = [0.16 * crouch, 0, 0]
      p.joints.spine = [0.1 * crouch - 0.06 * air, 0, 0]
      p.joints.neck = [-0.1 * air, 0, 0]
      for (const side of ['L', 'R'] as const) {
        limb(p, side, 'hip', -0.32 * crouch + 0.42 * tuck, 0, 0.04)
        limb(p, side, 'knee', 0.12 + 1.25 * crouch + 1.05 * tuck)
        limb(p, side, 'ankle', -0.15 * crouch - 0.3 * tuck)
        limb(p, side, 'shoulder', -0.85 * air, 0.04, 0.32 + 0.35 * air)
        limb(p, side, 'elbow', -0.3 - 0.35 * air)
      }
      p.gaze = [0, 0.035 * air]
      break
    }
    case 'drift': {
      const a = Math.sin(w), b = Math.sin(2 * w + 1), c = Math.cos(w + 0.5)
      p.lift = [0.08 * c, 0.75 + 0.14 * a, 0]
      p.joints.hips = [0.16 * a, 0.35 * Math.sin(w + 2), 0.1 * b]
      p.joints.spine = [-0.06 + 0.04 * b, 0, 0.04 * a]
      p.joints.neck = [-0.1 + 0.06 * b, 0.4 * dwell(w + 1.5), 0.06 * a]
      for (const [side, k] of [['L', 1], ['R', -1]] as const) {
        limb(p, side, 'shoulder', -0.25 + 0.2 * k * a, 0.1, 0.85 + 0.18 * Math.sin(w + k))
        limb(p, side, 'elbow', -0.45 - 0.15 * b)
        limb(p, side, 'wrist', 0.1, 0, -0.15)
        limb(p, side, 'hip', -0.32 + 0.22 * k * c, 0, 0.15)
        limb(p, side, 'knee', 0.45 + 0.2 * k * a)
        limb(p, side, 'ankle', 0.35)
      }
      p.joints.pack = [0.05 * b, 0, 0.04 * a]
      p.gaze = [0.035 * dwell(w + 1.5), 0.02]
      break
    }
  }
  return p
}

function accumulate(into: DrifterPose, from: DrifterPose, weight: number) {
  for (const name of drifterJoints) {
    const a = into.joints[name], b = from.joints[name]
    a[0] += b[0] * weight; a[1] += b[1] * weight; a[2] += b[2] * weight
  }
  for (let i = 0; i < 3; i++) into.lift[i] += from.lift[i] * weight
  into.blink += from.blink * weight
  into.gaze[0] += from.gaze[0] * weight; into.gaze[1] += from.gaze[1] * weight
}

// ─── model ───
export interface DrifterModel {
  object: Group
  joints: Record<DrifterJoint, Group>
  /** Body height and eye height in model units. */
  height: number
  eyeLine: number
  readonly clip: DrifterClip
  /** Cross-fades to `clip` over its own fade time, or `fade` seconds. */
  play(clip: DrifterClip, fade?: number): void
  /** `speed` is ground speed in model units per second; it drives the walk's phase and stride. */
  update(delta: number, motion?: { speed?: number }): void
  /** Applies a pose directly, bypassing the clip mixer. */
  apply(pose: DrifterPose): void
  showPivots(visible: boolean): void
  dispose(): void
}

export function createDrifter(): DrifterModel {
  const kit = materials()
  const { root, face } = buildBody(kit)
  const joints = {} as Record<DrifterJoint, Group>
  root.traverse((child) => {
    if (child.name.startsWith('drifter_') && child.name !== 'drifter_eyes') joints[child.name.slice(8) as DrifterJoint] = child as Group
  })
  // The sheet's joint-pivot markers, hidden unless asked for.
  const pivotGeometry = new SphereGeometry(0.055, 12, 8)
  const pivots = drifterJoints.filter((name) => name !== 'pack' && name !== 'spine').map((name) => {
    const marker = new Mesh(pivotGeometry, kit.pivot)
    marker.renderOrder = 10
    marker.visible = false
    joints[name].add(marker)
    return marker
  })

  const weights = new Map<DrifterClip, number>([['idle', 1]])
  const times = new Map<DrifterClip, number>()
  let current: DrifterClip = 'idle'
  let fadeTime = drifterClipInfo.idle.fade
  let stride = 0
  let blinkClock = 2.2, blinkSeed = 0x2f6b
  const nextBlink = () => {
    blinkSeed = (blinkSeed * 1103515245 + 12345) & 0x7fffffff
    return 2.4 + (blinkSeed / 0x7fffffff) * 3.2
  }
  let packSwing = 0, packVelocity = 0, lastLiftY = 0

  const apply = (pose: DrifterPose) => {
    for (const name of drifterJoints) joints[name].rotation.set(...pose.joints[name])
    joints.hips.position.set(pose.lift[0], HIP.y + pose.lift[1], pose.lift[2])
    const open = 1 - Math.max(0, Math.min(1, pose.blink))
    for (const eye of face.eyeMeshes) eye.scale.set(1, Math.max(0.08, open), 1)
    face.eyes.position.set(pose.gaze[0], pose.gaze[1], 0)
  }

  const model: DrifterModel = {
    object: root,
    joints,
    height: HEIGHT,
    eyeLine: EYE.y,
    get clip() { return current },
    play(clip, fade) {
      if (clip === current) return
      current = clip
      fadeTime = fade ?? drifterClipInfo[clip].fade
      if (!weights.has(clip)) { weights.set(clip, 0); times.set(clip, 0) }
    },
    update(delta, motion = {}) {
      const speed = motion.speed ?? 0
      // Fade every clip toward its target weight.
      const step = fadeTime > 0 ? delta / fadeTime : 1
      for (const [clip, weight] of weights) {
        const next = clip === current ? Math.min(1, weight + step) : Math.max(0, weight - step)
        if (next <= 0 && clip !== current) { weights.delete(clip); times.delete(clip); continue }
        weights.set(clip, next)
        if (clip !== 'walk') times.set(clip, (times.get(clip) ?? 0) + delta)
      }
      // Steps follow the ground covered, so the planted boot does not slide; slow walks take shorter steps.
      const amount = Math.min(1.3, speed / WALK_REFERENCE)
      stride = (stride + (speed * delta) / walkStride(Math.max(amount, 0.35))) % 1
      const pose = restPose()
      let total = 0
      for (const [clip, weight] of weights) {
        const w = ease(weight)
        if (w <= 0) continue
        const sample = clip === 'walk'
          ? drifterPose('walk', stride * drifterClipInfo.walk.duration, amount)
          : drifterPose(clip, times.get(clip) ?? 0)
        accumulate(pose, sample, w)
        total += w
      }
      if (total > 0 && total !== 1) {
        const normal = restPose()
        accumulate(normal, pose, 1 / total)
        Object.assign(pose, normal)
      }
      // Secondary motion: the backpack lags behind the body's rise and fall.
      const lift = pose.lift[1]
      const vertical = delta > 0 ? (lift - lastLiftY) / delta : 0
      lastLiftY = lift
      packVelocity += (-packSwing * 160 - packVelocity * 14 + vertical * 2.2) * delta
      packSwing += packVelocity * delta
      pose.joints.pack[0] += Math.max(-0.25, Math.min(0.25, packSwing))
      // Blinks run on their own clock so every clip gets them.
      blinkClock -= delta
      if (blinkClock < 0) blinkClock = nextBlink()
      const blink = blinkClock < 0.16 ? Math.sin((blinkClock / 0.16) * Math.PI) : 0
      pose.blink = Math.max(pose.blink, blink)
      apply(pose)
    },
    apply,
    showPivots(visible) { pivots.forEach((marker) => { marker.visible = visible }) },
    dispose() {
      const geometries = new Set<BufferGeometry>()
      root.traverse((child) => { if (child instanceof Mesh) geometries.add(child.geometry) })
      geometries.forEach((geometry) => geometry.dispose())
      Object.values(kit).forEach((material) => material.dispose())
      root.removeFromParent()
    },
  }
  model.update(0)
  return model
}

/** Ground speed, in model units per second, at which the walk reaches full stride: about 1.8 cycles a second. */
const WALK_REFERENCE = 3.7
export const drifterWalk = { reference: WALK_REFERENCE, stride: walkStride(1) }

/** Samples every clip into keyframes on the model's joints, for export (GLB) or for an AnimationMixer. */
export function bakeDrifterClips(model: DrifterModel, fps = 30): AnimationClip[] {
  const euler = new Euler(), quaternion = new Quaternion()
  return drifterClipNames.map((clip) => {
    const { duration } = drifterClipInfo[clip]
    const frames = Math.round(duration * fps)
    const times = Array.from({ length: frames + 1 }, (_, i) => (i / frames) * duration)
    const rotations = new Map<DrifterJoint, number[]>(drifterJoints.map((name) => [name, []]))
    const hips: number[] = [], eyeL: number[] = [], eyeR: number[] = [], eyes: number[] = []
    for (const time of times) {
      const pose = drifterPose(clip, time)
      // Baked loops carry one blink each, at a fixed moment.
      const into = (time % duration) / duration
      const blink = Math.abs(into - 0.62) < 0.16 / duration / 2 ? Math.cos(((into - 0.62) * duration / 0.16) * Math.PI) : 0
      pose.blink = Math.max(pose.blink, blink)
      for (const name of drifterJoints) {
        quaternion.setFromEuler(euler.set(...pose.joints[name]))
        rotations.get(name)!.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
      }
      hips.push(pose.lift[0], HIP.y + pose.lift[1], pose.lift[2])
      const open = Math.max(0.08, 1 - Math.min(1, pose.blink))
      eyeL.push(1, open, 1); eyeR.push(1, open, 1)
      eyes.push(pose.gaze[0], pose.gaze[1], 0)
    }
    const tracks = [
      ...drifterJoints.map((name) => new QuaternionKeyframeTrack(`${model.joints[name].name}.quaternion`, times, rotations.get(name)!)),
      new VectorKeyframeTrack('drifter_hips.position', times, hips),
      new VectorKeyframeTrack('eyeL.scale', times, eyeL),
      new VectorKeyframeTrack('eyeR.scale', times, eyeR),
      new VectorKeyframeTrack('drifter_eyes.position', times, eyes),
    ]
    return new AnimationClip(clip, duration, tracks)
  })
}
