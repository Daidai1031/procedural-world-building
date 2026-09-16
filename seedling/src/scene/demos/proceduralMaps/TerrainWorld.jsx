import { Grid } from '@react-three/drei'
import { readToken } from '../../../styles/readToken.js'

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
      <directionalLight position={[7, 10, 5]} intensity={simulation ? 2.15 : 2.1} castShadow shadow-mapSize={[1024, 1024]} />
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
