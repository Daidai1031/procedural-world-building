import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playDig } from '../audio/surfaceAudio'
import { tuning } from '../config/tuning'
import { stepSurface } from '../systems/surface'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'

// SUR-09: ground that heals does so in every mode, including Manual, where the crew is frozen.
export function SurfaceRunner({ world, store, active }: { world: PlanetWorld; store: ReturnType<typeof createRunStore>; active: boolean }) {
  const heard = useRef({ world, edits: world.edits, excavated: world.excavated })
  useFrame((_, delta) => {
    if (active) stepSurface(world, store, Math.min(delta, 0.1))
    // SUR-13: the world only counts edits, so simulation code stays free of audio.
    const last = heard.current
    if (last.world === world && last.edits !== world.edits) {
      const { fullAt, floor } = tuning.surface.sound
      playDig(world.surface, Math.min(1, Math.max(floor, (world.excavated - last.excavated) / fullAt)))
    }
    heard.current = { world, edits: world.edits, excavated: world.excavated }
  })
  return null
}
