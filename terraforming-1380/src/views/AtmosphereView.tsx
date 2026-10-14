import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { createAtmosphere } from '../render/atmosphere'

// D-027 atmosphere C4: seeded from the initial planet surface; it does not follow later terrain edits.
export function AtmosphereView({ seed }: { seed: string }) {
  const atmosphere = useMemo(() => createAtmosphere(seed), [seed])
  useEffect(() => () => atmosphere.dispose(), [atmosphere])
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  useFrame(({ clock }) => { if (!still) atmosphere.update(clock.elapsedTime) })
  return <primitive object={atmosphere.group} />
}
