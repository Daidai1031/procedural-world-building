import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { createAtmosphere } from '../render/atmosphere'
import { tuning } from '../config/tuning'
import { systemViewFrame } from '../state/systemView'

// D-027 atmosphere C4: seeded from the initial planet surface; it does not follow later terrain edits.
export function AtmosphereView({ seed }: { seed: string }) {
  const atmosphere = useMemo(() => createAtmosphere(seed), [seed])
  useEffect(() => () => atmosphere.dispose(), [atmosphere])
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  useFrame(({ clock }) => {
    if (!still) atmosphere.update(clock.elapsedTime)
    // Multiplied by 1 - smoothstep(fade.atmosphere, pull): fully visible in orbit view, gone when pulled back.
    const [from, to] = tuning.system.fade.atmosphere
    const t = Math.max(0, Math.min(1, (systemViewFrame.pull - from) / (to - from)))
    atmosphere.setFade(1 - t * t * (3 - 2 * t))
  })
  return <primitive object={atmosphere.group} />
}
