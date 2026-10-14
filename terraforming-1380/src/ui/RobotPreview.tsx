import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { createMiner, createGardener, createBuilder, type RobotRole } from '../render/models/robots'

function Model({ role, reducedMotion }: { role: RobotRole; reducedMotion: boolean }) {
  const turntable = useRef<Group>(null)
  const elapsed = useRef(0)
  const model = useMemo(() => ({ miner: createMiner, gardener: createGardener, builder: createBuilder })[role](), [role])
  useEffect(() => () => model.dispose(), [model])
  useFrame((_, delta) => {
    if (reducedMotion || !turntable.current) return
    const step = Math.min(delta, 0.05)
    elapsed.current += step
    turntable.current.rotation.y += step * 0.45
    model.update(elapsed.current)
  })
  return <group ref={turntable} rotation={[0, -0.5, 0]}><primitive object={model.object} /></group>
}

export function RobotPreview({ role }: { role: RobotRole }) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  return <div className="robot-preview" role="img" aria-label={role + ' 3D model'}>
    <Canvas frameloop={reducedMotion ? 'demand' : 'always'} gl={{ alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      camera={{ position: [0.32, 0.18, 0.45], fov: 38 }} dpr={[1, 1.5]}>
      <hemisphereLight intensity={2.4} args={['#ffffff', '#b7ad97']} />
      <directionalLight position={[2, 4, 3]} intensity={3} />
      <Model role={role} reducedMotion={reducedMotion} />
    </Canvas>
  </div>
}
