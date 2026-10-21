import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
} from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { useInstanceMatrices } from './instancing.js'
import { distributionSettingsFromParams } from './params.js'
import { buildRockGeometry } from './rock.js'
import { CandidateDots, TerrainMesh } from './ScenePieces.jsx'
import {
  buildPopulation,
  filterBySlope,
  generateCandidates,
  orientedInstanceMatrix,
} from './scatter.js'
import { SCATTER_WORLD_SIZE, buildTerrainSurface, buildTerrainWalls, moistureAt, normalAt } from './terrain.js'

const ASSET_COLORS = {
  rock: '--scatter-rock',
  tree: '--scatter-tree',
  farmland: '--scatter-field',
  antenna: '--scatter-antenna',
}

function buildGeometry(type) {
  if (type === 'rock') return [buildRockGeometry()]
  if (type === 'tree') {
    const trunk = new CylinderGeometry(0.045, 0.07, 0.42, 7)
    trunk.translate(0, 0.21, 0)
    const crown = new ConeGeometry(0.22, 0.5, 8)
    crown.translate(0, 0.61, 0)
    return [trunk, crown]
  }
  if (type === 'farmland') {
    const tile = new BoxGeometry(0.48, 0.045, 0.48)
    tile.translate(0, 0.012, 0)
    return [tile]
  }
  const base = new CylinderGeometry(0.13, 0.15, 0.06, 12)
  base.translate(0, 0.03, 0)
  const mast = new CylinderGeometry(0.022, 0.03, 0.68, 10)
  mast.translate(0, 0.37, 0)
  const dish = new BoxGeometry(0.2, 0.035, 0.13)
  dish.rotateX(-0.45)
  dish.translate(0, 0.7, 0)
  return [base, mast, dish]
}

function useAssetGeometries(type) {
  const geometries = useMemo(() => buildGeometry(type), [type])
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])
  return geometries
}

function Instances({ type, placements, colorFor }) {
  const geometries = useAssetGeometries(type)
  return geometries.map((geometry, part) => (
    <InstancePart key={`${type}-${part}`} geometry={geometry} placements={placements} colorFor={type === 'tree' && part === 0 ? undefined : colorFor} type={type} part={part} />
  ))
}

function InstancePart({ geometry, placements, colorFor, type, part }) {
  const meshRef = useRef(null)
  const wireframe = useSceneStore((state) => state.wireframe)
  const matrixFor = useCallback((placement, matrix) => orientedInstanceMatrix(placement.candidate, placement, matrix), [])
  useInstanceMatrices(meshRef, placements, matrixFor)

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !colorFor) return
    placements.forEach((placement, index) => mesh.setColorAt(index, colorFor(placement, new Color())))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [placements, colorFor])

  const token = type === 'tree' && part === 0 ? '--scatter-trunk' : ASSET_COLORS[type]
  return (
    <instancedMesh ref={meshRef} args={[geometry, null, 400]} frustumCulled={false} castShadow receiveShadow>
      <meshStandardMaterial color={readToken(token)} roughness={0.9} flatShading wireframe={wireframe} />
    </instancedMesh>
  )
}

function NormalLines({ candidates }) {
  const geometry = useMemo(() => {
    const positions = []
    for (const candidate of candidates.filter((_, index) => index % 5 === 0)) {
      const normal = normalAt(candidate.x, candidate.z)
      positions.push(candidate.x, candidate.y, candidate.z)
      positions.push(candidate.x + normal.x * 0.35, candidate.y + normal.y * 0.35, candidate.z + normal.z * 0.35)
    }
    const lines = new BufferGeometry()
    lines.setAttribute('position', new Float32BufferAttribute(positions, 3))
    return lines
  }, [candidates])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <lineSegments geometry={geometry}><lineBasicMaterial color={readToken('--scatter-normal')} /></lineSegments>
}

function Ground({ overlay }) {
  const overlayColor = useMemo(() => {
    if (overlay === 'height') return undefined
    if (overlay === 'moisture') {
      const dry = new Color(readToken('--summit'))
      const wet = new Color(readToken('--water-deep'))
      return (x, _y, z, color) => color.lerpColors(dry, wet, moistureAt(x, z))
    }
    const flat = new Color(readToken('--moss'))
    const steep = new Color(readToken('--clay-deep'))
    return (x, _y, z, color) => color.lerpColors(flat, steep, 1 - normalAt(x, z).y)
  }, [overlay])
  return <>
    <TerrainMesh build={buildTerrainSurface} overlayColor={overlayColor} />
    <TerrainMesh build={buildTerrainWalls} side={DoubleSide} />
  </>
}

function placementsFor(candidates, alignToSurface, yawRange) {
  return candidates.map((candidate, index) => ({
    candidate,
    alignToSurface,
    yaw: ((index * 0.61803398875) % 1 - 0.5) * yawRange * Math.PI / 90,
    scale: 1,
  }))
}

function SingleLayerDemo({ slopeFilter }) {
  const params = useSceneStore((state) => state.params)
  const setSceneStatus = useSceneStore((state) => state.setSceneStatus)
  const settings = distributionSettingsFromParams(params)
  const candidates = useMemo(() => generateCandidates(100, 52), [])
  const split = useMemo(
    () => slopeFilter ? filterBySlope(candidates, settings.maxSlope) : { accepted: candidates, rejected: [] },
    [candidates, slopeFilter, settings.maxSlope],
  )
  const followsSurface = slopeFilter
    ? ['rock', 'farmland'].includes(settings.assetType)
    : settings.alignment === 'surface'
  const yawRange = settings.assetType === 'farmland' ? 0 : settings.yawRange
  const placements = useMemo(
    () => placementsFor(split.accepted, followsSurface, yawRange),
    [split.accepted, followsSurface, yawRange],
  )

  useEffect(() => {
    setSceneStatus(slopeFilter
      ? `${split.accepted.length} accepted / ${candidates.length} candidates`
      : `${candidates.length} positions · ${followsSurface ? 'surface aligned' : 'upright'}`)
    return () => setSceneStatus('')
  }, [candidates.length, followsSurface, setSceneStatus, slopeFilter, split.accepted.length])

  return <TerrainWorld worldSize={SCATTER_WORLD_SIZE}>
    <Ground overlay={slopeFilter ? 'slope' : 'height'} />
    <Instances type={settings.assetType} placements={placements} />
    {settings.showRejected && <CandidateDots candidates={split.rejected} color="--scatter-rejected" />}
    {settings.showNormals && <NormalLines candidates={split.accepted} />}
  </TerrainWorld>
}

function Base({ anchor }) {
  if (!anchor) return null
  const buildings = [
    { offset: [-0.28, 0.12, -0.2], scale: [0.28, 0.24, 0.32] },
    { offset: [0.25, 0.09, -0.18], scale: [0.22, 0.18, 0.22] },
    { offset: [-0.2, 0.08, 0.24], scale: [0.2, 0.16, 0.28] },
    { offset: [0.24, 0.16, 0.22], scale: [0.18, 0.32, 0.18] },
  ]
  return <group position={[anchor.x, anchor.y, anchor.z]}>
    <mesh position={[0, 0.025, 0]} receiveShadow><cylinderGeometry args={[0.62, 0.68, 0.05, 20]} /><meshStandardMaterial color={readToken('--paper-3')} /></mesh>
    {buildings.map((building, index) => <mesh key={index} position={building.offset} scale={building.scale} castShadow>
      <boxGeometry />
      <meshStandardMaterial color={readToken('--scatter-base')} roughness={0.75} />
    </mesh>)}
  </group>
}

export function PopulationDemo() {
  const params = useSceneStore((state) => state.params)
  const setSceneStatus = useSceneStore((state) => state.setSceneStatus)
  const settings = distributionSettingsFromParams(params)
  const population = useMemo(() => buildPopulation({
    seed: params.scatterSeed,
    exclusionRadius: settings.exclusionRadius,
    antennaSpacing: settings.antennaSpacing,
    terrainDriven: settings.variationSource === 'terrain',
  }), [params.scatterSeed, settings.antennaSpacing, settings.exclusionRadius, settings.variationSource])

  useEffect(() => {
    const counts = ['tree', 'rock', 'farmland', 'antenna'].map((type) => `${type} ${population[type].length}`).join(' · ')
    setSceneStatus(counts)
    return () => setSceneStatus('')
  }, [population, setSceneStatus])

  const treeColor = useCallback((placement, color) => {
    const dry = new Color(readToken('--meadow-deep'))
    const wet = new Color(readToken('--moss-deep'))
    return settings.variationSource === 'terrain' ? color.lerpColors(dry, wet, placement.moisture) : color.copy(dry)
  }, [settings.variationSource])
  const fieldColor = useCallback((placement, color) => {
    const dry = new Color(readToken('--summit'))
    const wet = new Color(readToken('--summit-deep'))
    return settings.variationSource === 'terrain' ? color.lerpColors(dry, wet, placement.moisture) : color.copy(dry)
  }, [settings.variationSource])

  return <TerrainWorld worldSize={SCATTER_WORLD_SIZE}>
    <Ground overlay={settings.overlay} />
    {settings.visible.tree && <Instances type="tree" placements={population.tree} colorFor={treeColor} />}
    {settings.visible.rock && <Instances type="rock" placements={population.rock} />}
    {settings.visible.farmland && <Instances type="farmland" placements={population.farmland} colorFor={fieldColor} />}
    {settings.visible.antenna && <Instances type="antenna" placements={population.antenna} />}
    {settings.visible.base && <Base anchor={population.anchor} />}
  </TerrainWorld>
}

export function OrientationDemo() {
  return <SingleLayerDemo slopeFilter={false} />
}

export function SlopeDemo() {
  return <SingleLayerDemo slopeFilter />
}
