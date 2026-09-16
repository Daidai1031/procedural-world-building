import { Grid } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import { entities, SELECTED_SCALE } from './entities.js'

// Held well below 1: the metal needs the reflection, but at full strength the
// environment also floods the matte surfaces and drains the palette back out of
// them. Step 07 quotes the ambient light's 0.4, so that one cannot be turned
// down to compensate.
const ENVIRONMENT_INTENSITY = 0.45

// A metal surface shows you its surroundings and nothing else. With nothing to
// reflect, the sphere renders black and step 03 — "most of what you see is the
// scene reflected back at you" — contradicts the picture beside it.
// RoomEnvironment is generated in memory, so this costs no network request.
function useStudioEnvironment() {
  const renderer = useThree((state) => state.gl)

  const environment = useMemo(() => {
    const generator = new PMREMGenerator(renderer)
    const texture = generator.fromScene(new RoomEnvironment(), 0.04).texture
    generator.dispose()
    return texture
  }, [renderer])

  useEffect(() => () => environment.dispose(), [environment])

  return environment
}

function EntityGeometry({ geometry }) {
  if (geometry.kind === 'box') return <boxGeometry args={geometry.args} />
  if (geometry.kind === 'sphere') return <sphereGeometry args={geometry.args} />
  if (geometry.kind === 'cylinder') return <cylinderGeometry args={geometry.args} />
  return <torusKnotGeometry args={geometry.args} />
}

function EntityMaterial({ material, color }) {
  if (material.kind === 'basic') return <meshBasicMaterial color={color} />

  return (
    <meshStandardMaterial
      color={color}
      envMapIntensity={ENVIRONMENT_INTENSITY}
      roughness={material.roughness}
      metalness={material.metalness}
    />
  )
}

function SelectableEntity({ entity, color, isSelected, onSelect }) {
  return (
    <mesh
      position={entity.position}
      scale={isSelected ? SELECTED_SCALE : 1}
      castShadow={entity.castShadow}
      receiveShadow={entity.receiveShadow}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(entity.id)
      }}
    >
      <EntityGeometry geometry={entity.geometry} />
      <EntityMaterial material={entity.material} color={color} />
    </mesh>
  )
}

export default function SceneAnatomyDemo() {
  const selectedEntity = useSceneStore((state) => state.params.selectedEntity)
  const setParam = useSceneStore((state) => state.setParam)
  const studioEnvironment = useStudioEnvironment()

  // Paper, ruled twice: fine lines in --line, section lines in --ink-faint. The
  // ground is --paper-2 rather than --paper so the white card reads against it
  // without needing anything ramped behind the card.
  const palette = useMemo(
    () => ({
      ground: readToken('--paper-2'),
      grid: readToken('--line'),
      gridSection: readToken('--ink-faint'),
      skyBounce: readToken('--studio-bounce-down'),
      groundBounce: readToken('--studio-bounce-up'),
      entities: Object.fromEntries(
        entities.map((entity) => [entity.id, readToken(entity.colorToken)]),
      ),
    }),
    [],
  )

  return (
    <>
      <color attach="background" args={[palette.ground]} />
      <primitive object={studioEnvironment} attach="environment" />

      <ambientLight intensity={0.4} />
      <hemisphereLight args={[palette.skyBounce, palette.groundBounce, 0.5]} />
      <directionalLight
        position={[8, 12, 5]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {entities.map((entity) => (
        <SelectableEntity
          key={entity.id}
          entity={entity}
          color={palette.entities[entity.id]}
          isSelected={entity.id === selectedEntity}
          onSelect={(entityId) => setParam('selectedEntity', entityId)}
        />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial opacity={0.35} />
      </mesh>

      <Grid
        position={[0, 0.01, 0]}
        args={[10, 10]}
        infiniteGrid
        cellSize={0.5}
        cellThickness={0.6}
        cellColor={palette.grid}
        sectionSize={2.5}
        sectionThickness={1.2}
        sectionColor={palette.gridSection}
        fadeDistance={35}
        fadeStrength={1}
      />
    </>
  )
}
