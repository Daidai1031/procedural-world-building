import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { CircleGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three'
import type { ResidentKind } from '../content/residents'
import { createDrifter, drifterPose } from '../render/models/drifter'
import { createResidentKit, createResidentModel, type ResidentPose } from '../render/models/residents'

const FADE_MS = 400

// Straight on, pulled back so the Drifter and the creatures around him sit above the title.
const cameraAt = { x: 0, y: 1.85, z: 16.4 }
const aimAt = { x: 0, y: 1.55, z: 0 }

const species: ResidentKind[] = ['facet', 'moss', 'slab', 'crystal', 'sentinel', 'hermit', 'cairn', 'periscope', 'shard', 'glassfin']
const fit: Record<ResidentKind, number> = {
  facet: 0.95, moss: 0.95, slab: 0.62, crystal: 0.85, sentinel: 0.9,
  hermit: 0.82, cairn: 0.82, periscope: 1, shard: 0.72, glassfin: 0.95,
}

type Guest = { kind: ResidentKind; seed: number; at: [number, number, number]; scale: number }

// Five species, a new draw each visit, scattered in the air around the Drifter.
function scatterGuests(): Guest[] {
  let seed = (Math.floor(Math.random() * 0x7fffffff) || 1) >>> 0
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
  const pool = [...species]
  const picked: ResidentKind[] = []
  while (picked.length < 5) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0])
  const spots: { x: number; y: number; z: number }[] = []
  return picked.map((kind) => {
    let spot = { x: 2, y: 2, z: 0 }
    for (let attempt = 0; attempt < 30; attempt++) {
      const onLeft = spots.filter(place => place.x < 0).length
      const sign = onLeft >= 3 ? 1 : spots.length - onLeft >= 3 ? -1 : (random() < 0.5 ? -1 : 1)
      spot = {
        x: sign * (1.9 + random() * 2.35),
        y: 1.35 + random() * 2.15,
        z: -0.5 + random() * 1.85,
      }
      const clear = spots.every((other) => {
        const dx = other.x - spot.x
        const dy = other.y - spot.y
        const dz = other.z - spot.z
        return dx * dx + dy * dy * 1.4 + dz * dz > 1.7
      })
      if (clear) break
    }
    spots.push(spot)
    return {
      kind,
      seed: 1 + Math.floor(random() * 997),
      at: [spot.x, spot.y, spot.z],
      scale: fit[kind] * (0.92 + random() * 0.12),
    }
  })
}

function faceUser(x: number, z: number) {
  return Math.atan2(cameraAt.x - x, cameraAt.z - z)
}

function hover(time: number, phase: number, still: boolean) {
  const base = 0.16
  return still ? base : base + Math.sin(time * 1.25 + phase) * 0.1
}

// A brief hump: 0 most of the time, rising to 1 and back across `hold` of each `every` seconds.
function pulse(time: number, every: number, hold: number) {
  const into = (time % every) / every
  return into < hold ? Math.sin((into / hold) * Math.PI) : 0
}

// Each species does what it is known for, instead of the whole row watching the player.
function act(kind: ResidentKind, time: number, still: boolean): ResidentPose {
  switch (kind) {
    case 'facet':
      return { tuck: 0, shut: 0, peek: still ? 0.65 : 0.4 + 0.55 * Math.sin(time * 1.2), shake: 0, walk: 0 }
    case 'moss':
      return { tuck: 0.06, shut: 0, peek: 0.12, shake: 0, walk: 0 }
    case 'slab':
      return { tuck: 0, shut: 0, peek: 0.06, shake: 0, walk: 0 }
    case 'crystal': {
      const peek = still ? 0.85 : pulse(time, 3.4, 0.28)
      return { tuck: peek > 0.2 ? 0.05 : 0.4, shut: 1 - peek, peek, shake: 0.15 + peek * 0.75, walk: 0 }
    }
    case 'sentinel':
      return { tuck: 0, shut: 0, peek: 1, shake: 0, walk: 0 }
    case 'hermit': {
      const out = still ? 0.2 : pulse(time, 6.5, 0.18)
      return { tuck: 0.25 + (1 - out) * 0.45, shut: 1 - out, peek: out * 0.45, shake: 0, walk: 0 }
    }
    case 'cairn':
      return { tuck: 0, shut: 0, peek: 0.85, shake: 0.3, walk: still ? 0.2 : 0.5 }
    case 'periscope':
      return { tuck: 0.78, shut: 0, peek: still ? 0.75 : 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(time * 0.75)), shake: 0, walk: 0 }
    case 'shard':
      return { tuck: 0, shut: 0, peek: still ? 0.4 : (Math.sin(time * 3.4) > 0 ? 0.95 : 0.1), shake: 0.15, walk: still ? 0 : 0.9 }
    case 'glassfin':
      return { tuck: 0, shut: 0, peek: 0.2, shake: 0, walk: still ? 0 : 0.45 }
  }
}

function manner(kind: ResidentKind, time: number, still: boolean) {
  const bob = (amount: number, speed: number, phase: number) => still ? amount * 0.5 : amount * 0.5 + Math.sin(time * speed + phase) * amount * 0.5
  switch (kind) {
    case 'facet':
      return { x: 0, y: bob(0.08, 1.1, 0.4), z: 0, yaw: Math.sin(time * 0.7) * (still ? 0.35 : 0.7) }
    case 'moss':
      return { x: 0, y: bob(0.03, 0.45, 1), z: 0, yaw: 0.4 }
    case 'slab':
      return { x: 0, y: 0.02, z: 0, yaw: -0.22 }
    case 'crystal':
      return { x: 0, y: bob(0.03, 2.2, 0), z: 0, yaw: Math.sin(time * 2.6) * (still ? 0 : 0.18) }
    case 'sentinel':
      return { x: 0, y: bob(0.06, 0.8, 0.2), z: 0, yaw: Math.sin(time * 0.42) * (still ? 0.35 : 0.95) }
    case 'hermit':
      return { x: 0, y: 0.02, z: 0, yaw: 1.05 }
    case 'cairn':
      return { x: 0, y: bob(0.05, 1.6, 2), z: 0, yaw: 0.55 + Math.sin(time * 1.5) * (still ? 0 : 0.2) }
    case 'periscope':
      return { x: 0, y: -0.04, z: 0, yaw: Math.sin(time * 0.55) * (still ? 0.2 : 0.55) }
    case 'shard':
      return { x: Math.sin(time * 1.7) * (still ? 0 : 0.22), y: bob(0.04, 1.7, 0.6), z: 0, yaw: Math.cos(time * 1.7) * (still ? 0.2 : 0.55) }
    case 'glassfin':
      return {
        x: Math.sin(time * 0.8) * (still ? 0.1 : 0.42),
        y: 0.2 + (still ? 0 : Math.sin(time * 1.15) * 0.14),
        z: Math.cos(time * 0.8) * (still ? 0 : 0.12),
        yaw: still ? 0.7 : Math.atan2(Math.cos(time * 0.8), -Math.sin(time * 0.8)),
      }
  }
}

// Drawn in the game canvas, so the greeting and the planet that follows share one WebGL context.
export function OpeningGreeting() {
  const camera = useThree(state => state.camera)
  const gl = useThree(state => state.gl)
  const scene = useThree(state => state.scene)
  const invalidate = useThree(state => state.invalidate)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  const drifter = useMemo(() => createDrifter(), [])
  const crowd = useMemo(() => {
    const kit = createResidentKit()
    const guests = scatterGuests()
    const models = guests.map((guest) => {
      const model = createResidentModel(guest.kind, guest.seed, kit)
      model.update(act(guest.kind, 0, true), 0, 10, 1)
      return model
    })
    return { kit, models, guests }
  }, [])
  const shadow = useMemo(() => new Mesh(
    new CircleGeometry(1.7, 40),
    new MeshBasicMaterial({ color: '#d9d3c6', transparent: true, opacity: 0.4, depthWrite: false }),
  ), [])
  const drifterAnchor = useRef<Group>(null)
  const guestAnchors = useRef<(Group | null)[]>([])
  const time = useRef(0)
  useEffect(() => () => {
    drifter.dispose()
    for (const model of crowd.models) model.dispose()
    crowd.kit.dispose()
    shadow.geometry.dispose()
    ;(shadow.material as MeshBasicMaterial).dispose()
  }, [crowd, drifter, shadow])
  useEffect(() => {
    const position = camera.position.clone()
    const quaternion = camera.quaternion.clone()
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 42
    camera.position.set(cameraAt.x, cameraAt.y, cameraAt.z)
    camera.lookAt(aimAt.x, aimAt.y, aimAt.z)
    if (camera instanceof PerspectiveCamera) {
      camera.fov = 34
      camera.updateProjectionMatrix()
    }
    gl.setClearColor(0xf3f1eb, 1)
    let blinkClock = 0.8
    const blinkOf = (step: number) => {
      blinkClock -= step
      if (blinkClock < 0) blinkClock = 2.2 + Math.random() * 2.2
      return blinkClock < 0.14 ? Math.sin((blinkClock / 0.14) * Math.PI) : 0
    }
    // Drift floats with loose limbs. The turn is locked so he keeps looking at the player, and the rise stays in frame.
    const poseAt = (seconds: number, blink: number) => {
      const pose = drifterPose('drift', seconds)
      pose.lift[1] = 0.2 + Math.sin(seconds * 1.15) * 0.1
      pose.joints.hips[1] = 0
      pose.joints.spine[1] = 0
      pose.joints.neck[1] = 0
      pose.gaze[0] = 0
      pose.blink = blink
      return pose
    }
    const place = (seconds: number, still: boolean) => {
      const drifterNode = drifterAnchor.current
      if (drifterNode) drifterNode.position.y = hover(seconds, 0.2, still)
      guestAnchors.current.forEach((node, index) => {
        const guest = crowd.guests[index]
        if (!node) return
        const move = manner(guest.kind, seconds, still)
        const drift = Math.sin(seconds * (0.8 + index * 0.09) + index * 1.4) * (still ? 0 : 0.2)
        const x = Math.max(-4.7, Math.min(4.7, guest.at[0] + move.x))
        const z = Math.max(-1.3, Math.min(2.2, guest.at[2] + move.z))
        node.position.set(x, guest.at[1] + move.y + drift, z)
        // The swimmer heads along its path. Everyone else stays readable, then turns into their own habit.
        node.rotation.y = guest.kind === 'glassfin' ? move.yaw : faceUser(x, z) + move.yaw
      })
    }
    let frame = 0
    let timer = 0
    let stopped = false
    // A hidden document never fires animation frames, so the greeting keeps its own clock there.
    const schedule = (tick: (now: number) => void) => {
      if (document.hidden) timer = window.setTimeout(() => tick(performance.now()), 32)
      else frame = requestAnimationFrame(tick)
    }
    if (reducedMotion) {
      drifter.apply(poseAt(1.4, 0))
      crowd.models.forEach((model, index) => model.update(act(crowd.guests[index].kind, 1.4, true), 1.4, 10, 1))
      place(1.4, true)
      gl.render(scene, camera)
    } else {
      drifter.apply(poseAt(0, 0))
      let last = performance.now()
      const tick = (now: number) => {
        if (stopped) return
        schedule(tick)
        const step = Math.min(0.05, (now - last) / 1000)
        last = now
        time.current += step
        drifter.apply(poseAt(time.current, blinkOf(step)))
        crowd.models.forEach((model, index) => model.update(act(crowd.guests[index].kind, time.current, false), time.current, step, 1))
        place(time.current, false)
        gl.render(scene, camera)
      }
      schedule(tick)
    }
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      camera.position.copy(position)
      camera.quaternion.copy(quaternion)
      if (camera instanceof PerspectiveCamera) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
      gl.setClearColor(0x000000, 0)
      invalidate()
    }
  }, [camera, crowd, drifter, gl, invalidate, reducedMotion, scene])
  const drifterAt: [number, number, number] = [0, 0, 0.45]
  return <group>
    <hemisphereLight intensity={2.2} args={['#ffffff', '#c7bba6']} />
    <directionalLight position={[2.5, 6, 4]} intensity={2.6} />
    <directionalLight position={[-4, 2.5, 2]} intensity={0.85} />
    <primitive object={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.45]} />
    <group ref={drifterAnchor} position={drifterAt} rotation={[0, faceUser(drifterAt[0], drifterAt[2]), 0]}>
      <primitive object={drifter.object} />
    </group>
    {crowd.models.map((model, index) => {
      const guest = crowd.guests[index]
      return <group key={guest.kind} ref={(node) => { guestAnchors.current[index] = node }}
        position={guest.at} rotation={[0, faceUser(guest.at[0], guest.at[2]), 0]}>
        <primitive object={model.object} scale={guest.scale} />
      </group>
    })}
  </group>
}

export function OpeningTitle({ onReveal, onComplete }: { onReveal: () => void; onComplete: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const started = useRef(false)
  useEffect(() => {
    if (!leaving) return
    const finish = window.setTimeout(onComplete, FADE_MS)
    return () => window.clearTimeout(finish)
  }, [leaving, onComplete])
  const begin = () => {
    if (started.current) return
    started.current = true
    setLeaving(true)
    onReveal()
  }
  return <section className="opening-title" data-leaving={leaving} aria-label="Game introduction">
    <div className="opening-title-copy">
      <h1>Tiny Dent</h1>
      <em>We’re here to put a dent in the universe.</em>
      <button className="opening-start" onClick={begin}>Start</button>
    </div>
  </section>
}
