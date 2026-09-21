import { useLayoutEffect, useRef } from 'react'
import { Grid } from '@react-three/drei'
import { readToken } from '../../../styles/readToken.js'

// The key light's shadow map only covers the box its shadow camera sees. That
// box has to grow with the world, or a large world is lit and shadowed only in
// the middle and the rest looks flat and pale.
const LIGHT_DIRECTION = [0.7, 1, 0.5]
const BASE_WORLD_SIZE = 10

function KeyLight({ simulation, worldSize }) {
  const lightRef = useRef(null)
  const scale = Math.max(1, worldSize / BASE_WORLD_SIZE)
  const reach = worldSize * 0.9

  useLayoutEffect(() => {
    const camera = lightRef.current.shadow.camera
    camera.left = -reach
    camera.right = reach
    camera.top = reach
    camera.bottom = -reach
    camera.near = 0.5
    camera.far = 40 * scale
    camera.updateProjectionMatrix()
  }, [reach, scale])

  return (
    <directionalLight
      ref={lightRef}
      position={LIGHT_DIRECTION.map((component) => component * 10 * scale)}
      intensity={simulation ? 2.15 : 2.1}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03 * scale}
    />
  )
}

export default function TerrainWorld({ simulation = false, worldSize = 10, children }) {
  return (
    <>
      <color attach="background" args={[readToken('--paper')]} />
      <ambientLight intensity={simulation ? 0.58 : 0.6} />
      <hemisphereLight args={[
        readToken(simulation ? '--erosion-bounce-down' : '--studio-bounce-down'),
        readToken(simulation ? '--erosion-bounce-up' : '--studio-bounce-up'),
        0.45,
      ]} />
      <KeyLight simulation={simulation} worldSize={worldSize} />
      {children}
      <Grid
        position={[0, -0.03, 0]}
        args={[worldSize + 2, worldSize + 2]}
        cellSize={simulation ? worldSize / 10 : 0.5}
        cellThickness={0.55}
        cellColor={readToken('--terrain-grid')}
        sectionSize={simulation ? worldSize / 2 : 2.5}
        sectionThickness={1.1}
        sectionColor={readToken('--terrain-grid-section')}
        fadeDistance={worldSize * 2.5}
        fadeStrength={1}
      />
    </>
  )
}
