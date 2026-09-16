import { Grid } from '@react-three/drei'
import { readToken } from '../../../styles/readToken.js'
import Selectable from './Selectable.jsx'
import useStudioEnvironment from './useStudioEnvironment.js'

const BOX_ORANGE = readToken('--object-box')
const SPHERE_BLUE = readToken('--water')
const CONE_YELLOW = readToken('--summit')
const TORUS_GREEN = readToken('--moss')
const GROUND = readToken('--paper-2')
const GRID_LINE = readToken('--line')
const GRID_SECTION = readToken('--ink-faint')
const SKY_BOUNCE = readToken('--studio-bounce-down')
const GROUND_BOUNCE = readToken('--studio-bounce-up')

function SceneLights() {
  return (
    <>
      {/* #region scene-lights */}
      {/* #region fill-lights */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={[SKY_BOUNCE, GROUND_BOUNCE, 0.5]} />
      {/* #endregion */}
      {/* #region key-light */}
      <directionalLight
        position={[8, 12, 5]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {/* #endregion */}
      {/* #endregion */}
    </>
  )
}

function SceneEntities() {
  return (
    <>
      {/* #region matte-and-metal */}
      {/* #region box */}
      <Selectable id="box">
        <mesh position={[-2.5, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial
            color={BOX_ORANGE}
            envMapIntensity={0.45}
            roughness={0.65}
            metalness={0.05}
          />
        </mesh>
      </Selectable>
      {/* #endregion box */}
      {/* #region curved-geometry */}
      <Selectable id="sphere">
        {/* #region sphere */}
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[1, 48, 48]} />
          <meshStandardMaterial
            color={SPHERE_BLUE}
            envMapIntensity={0.45}
            roughness={0.15}
            metalness={0.9}
          />
        </mesh>
        {/* #endregion */}
      </Selectable>
      {/* #endregion matte-and-metal */}

      <Selectable id="cone">
        {/* #region cone */}
        <mesh position={[2.5, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0, 0.9, 1.8, 32]} />
          <meshBasicMaterial color={CONE_YELLOW} />
        </mesh>
        {/* #endregion */}
      </Selectable>
      <Selectable id="torus">
        {/* #region torus */}
        <mesh position={[0, 1, -3]} castShadow>
          <torusKnotGeometry args={[0.6, 0.2, 160, 32]} />
          <meshStandardMaterial
            color={TORUS_GREEN}
            envMapIntensity={0.45}
            roughness={0.25}
            metalness={0.4}
          />
        </mesh>
        {/* #endregion */}
      </Selectable>
      {/* #endregion */}
    </>
  )
}

function SceneGround() {
  return (
    <>
      {/* #region floor-and-grid */}
      {/* #region floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial opacity={0.35} />
      </mesh>
      {/* #endregion */}
      {/* #region grid */}
      <Grid
        position={[0, 0.01, 0]}
        args={[10, 10]}
        infiniteGrid
        cellSize={0.5}
        cellThickness={0.6}
        cellColor={GRID_LINE}
        sectionSize={2.5}
        sectionThickness={1.2}
        sectionColor={GRID_SECTION}
        fadeDistance={35}
        fadeStrength={1}
      />
      {/* #endregion */}
      {/* #endregion */}
    </>
  )
}

function StudioEnvironment() {
  const studioEnvironment = useStudioEnvironment()
  return <primitive object={studioEnvironment} attach="environment" />
}

// The scene groups its environment, lights, entities, and ground.
export default function SceneAnatomyDemo() {
  return (
    <>
      <color attach="background" args={[GROUND]} />
      <StudioEnvironment />
      <SceneLights />
      <SceneEntities />
      <SceneGround />
    </>
  )
}
