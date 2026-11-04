import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CircleGeometry, Mesh, MeshBasicMaterial } from 'three'
import type { ResidentKind } from '../content/residents'
import { createDrifter, drifterPose } from '../render/models/drifter'
import { createResidentKit, createResidentModel, type ResidentPose } from '../render/models/residents'

// Two loops of the wave, then the card fades and the orbit interface underneath takes over.
const WAVE_MS = 20000
const FADE_MS = 400
const STILL_MS = 1400

const looking: ResidentPose = { tuck: 0, shut: 0, peek: 0.45, shake: 0, walk: 0 }

const guests: { kind: ResidentKind; seed: number; at: [number, number, number]; scale: number }[] = [
  { kind: 'facet', seed: 4, at: [1.75, 0, 1.4], scale: 1.7 },
  { kind: 'moss', seed: 11, at: [-1.8, 0, 1.2], scale: 1.85 },
  { kind: 'cairn', seed: 7, at: [0.6, 0, 2.4], scale: 1.55 },
  { kind: 'shard', seed: 2, at: [-0.75, 0, 2.2], scale: 1.65 },
]

function faceOrigin(x: number, z: number) {
  return Math.atan2(-x, -z)
}

function Greeting({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree(state => state.camera)
  const drifter = useMemo(() => createDrifter(), [])
  const crowd = useMemo(() => {
    const kit = createResidentKit()
    const models = guests.map((guest) => {
      const model = createResidentModel(guest.kind, guest.seed, kit)
      model.update(looking, 0, 10, 1)
      return model
    })
    return { kit, models }
  }, [])
  const shadow = useMemo(() => new Mesh(
    new CircleGeometry(3.4, 48),
    new MeshBasicMaterial({ color: '#c9c3b6', transparent: true, opacity: 0.55, depthWrite: false }),
  ), [])
  const time = useRef(0)
  useEffect(() => {
    camera.lookAt(0, 1.95, 0.7)
    if (reducedMotion) drifter.apply(drifterPose('wave', 0.25))
    else drifter.play('wave', 0.2)
  }, [camera, drifter, reducedMotion])
  useEffect(() => () => {
    drifter.dispose()
    for (const model of crowd.models) model.dispose()
    crowd.kit.dispose()
    shadow.geometry.dispose()
    ;(shadow.material as MeshBasicMaterial).dispose()
  }, [crowd, drifter, shadow])
  useFrame((_, delta) => {
    if (reducedMotion) return
    const step = Math.min(delta, 0.05)
    time.current += step
    drifter.update(step)
    for (const model of crowd.models) model.update(looking, time.current, step, 1)
  })
  return <group>
    <primitive object={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.8]} />
    <primitive object={drifter.object} />
    {crowd.models.map((model, index) => {
      const guest = guests[index]
      return <primitive key={guest.kind} object={model.object} position={guest.at} scale={guest.scale}
        rotation={[0, faceOrigin(guest.at[0], guest.at[2]), 0]} />
    })}
  </group>
}

export function OpeningTitle({ onComplete }: { onComplete: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const hold = reducedMotion ? STILL_MS : WAVE_MS
    const fade = window.setTimeout(() => setLeaving(true), hold)
    const finish = window.setTimeout(onComplete, hold + FADE_MS)
    return () => { window.clearTimeout(fade); window.clearTimeout(finish) }
  }, [onComplete, reducedMotion])
  return <section className="opening-title" data-leaving={leaving} aria-label="Game introduction">
    <div className="opening-title-copy">
      <div className="opening-wave" role="img" aria-label="The Drifter waves to the residents">
        <Canvas gl={{ alpha: true }} camera={{ position: [-2.35, 2.35, 5.6], fov: 32 }} dpr={[1, 1.5]}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}>
          <hemisphereLight intensity={2.2} args={['#ffffff', '#c7bba6']} />
          <directionalLight position={[3, 5, 4]} intensity={2.8} />
          <directionalLight position={[-3, 2, -2]} intensity={0.7} />
          <Greeting reducedMotion={reducedMotion} />
        </Canvas>
      </div>
      <h1>Tiny Dent</h1>
      <em>We’re here to put a dent in the universe.</em>
    </div>
    <button onClick={onComplete}>Skip intro →</button>
  </section>
}
