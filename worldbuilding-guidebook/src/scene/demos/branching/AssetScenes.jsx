import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { BufferAttribute, BufferGeometry } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { readToken } from '../../../styles/readToken.js'
import { assetConfigFromParams, generateAsset } from './asset.js'
import { skeletonPositions, tubeIndex, tubeSegments, writeTubes } from './assetGeometry.js'
import { growthProgress } from './growth.js'
import { buildLodSet, chooseLod } from './lod.js'
import { useBranchingPlayback } from './playback.js'

const GROWTH_SECONDS = 4
const THUMBNAIL_SCALE = 0.45
const THUMBNAIL_SEEDS = [1, 2, 3]
const LOD_SPACING = 2.6

// A geometry built from inputs and disposed when they change or the scene goes.
function useGeometry(factory, dependencies) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(factory, dependencies)
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

// Light, a floor grid and a plain background. The grid is a teaching helper, so
// Preview hides it.
function Stage({ helpers = true }) {
  return <>
    <color attach="background" args={[readToken('--paper')]} />
    <ambientLight intensity={0.7} />
    <directionalLight position={[4, 8, 5]} intensity={2} />
    {helpers && <Grid
      position={[0, -0.01, 0]} args={[14, 14]} cellSize={0.5} cellThickness={0.55}
      cellColor={readToken('--terrain-grid')} sectionSize={2.5} sectionThickness={1.1}
      sectionColor={readToken('--terrain-grid-section')} fadeDistance={22} fadeStrength={1}
    />}
  </>
}

function useAssetSegments(seedOverride) {
  const preset = useSceneStore((state) => state.params.branchingPreset)
  const generation = useSceneStore((state) => state.params.branchingAssetGeneration)
  const angle = useSceneStore((state) => state.params.branchingAssetAngle)
  const lengthRatio = useSceneStore((state) => state.params.branchingAssetLengthRatio)
  const radiusRatio = useSceneStore((state) => state.params.branchingAssetRadiusRatio)
  const spread = useSceneStore((state) => state.params.branchingSpread)
  const variation = useSceneStore((state) => state.params.branchingVariation)
  const seed = useSceneStore((state) => state.params.branchingSeed)
  return useMemo(() => generateAsset(assetConfigFromParams({
    branchingPreset: preset, branchingAssetGeneration: generation, branchingAssetAngle: angle, branchingAssetLengthRatio: lengthRatio,
    branchingAssetRadiusRatio: radiusRatio, branchingSpread: spread, branchingVariation: variation, branchingSeed: seedOverride ?? seed,
  })).segments, [preset, generation, angle, lengthRatio, radiusRatio, spread, variation, seed, seedOverride])
}

const ASSET_COLOUR = '--paper-3'
const LINE_COLOUR = '--ink-dim'

function SolidMesh({ segments, sides, ...props }) {
  const geometry = useGeometry(() => {
    const built = new BufferGeometry()
    const positions = new Float32Array(segments.length * sides * 2 * 3)
    writeTubes(positions, tubeSegments(segments), sides)
    built.setAttribute('position', new BufferAttribute(positions, 3))
    built.setIndex(new BufferAttribute(tubeIndex(segments.length, sides), 1))
    return built
  }, [segments, sides])
  return <mesh geometry={geometry} {...props}>
    <meshStandardMaterial color={readToken(ASSET_COLOUR)} roughness={1} flatShading side={2} />
  </mesh>
}

function SkeletonLines({ segments, token = LINE_COLOUR, ...props }) {
  const geometry = useGeometry(() => {
    const built = new BufferGeometry()
    built.setAttribute('position', new BufferAttribute(skeletonPositions(segments), 3))
    return built
  }, [segments])
  return <lineSegments geometry={geometry} {...props}><lineBasicMaterial color={readToken(token)} /></lineSegments>
}

function Asset({ segments, look, ...props }) {
  return look === 'Solid' ? <SolidMesh segments={segments} sides={8} {...props} /> : <SkeletonLines segments={segments} {...props} />
}

export function AssetScene() {
  const look = useSceneStore((state) => state.params.branchingLook)
  const preview = useSceneStore((state) => state.params.branchingPreview)
  const main = useAssetSegments()
  const first = useAssetSegments(THUMBNAIL_SEEDS[0])
  const second = useAssetSegments(THUMBNAIL_SEEDS[1])
  const third = useAssetSegments(THUMBNAIL_SEEDS[2])
  return <>
    <Stage helpers={!preview} />
    <Asset segments={main} look={look} position={[-2.4, 0, 0]} />
    {[first, second, third].map((segments, index) => (
      <Asset key={index} segments={segments} look={look} position={[0.3 + index * 1.2, 0, 0]} scale={THUMBNAIL_SCALE} />
    ))}
  </>
}

// The pieces on screen at the current time, rewritten into fixed buffers each
// frame. The structure is generated once; time only decides how much shows.
function GrowingAsset({ segments, mode, look }) {
  const sides = 8
  const geometry = useGeometry(() => {
    const built = new BufferGeometry()
    built.setAttribute('position', new BufferAttribute(new Float32Array(segments.length * sides * 2 * 3), 3))
    built.setIndex(new BufferAttribute(tubeIndex(segments.length, sides), 1))
    return built
  }, [segments])
  const lines = useGeometry(() => {
    const built = new BufferGeometry()
    built.setAttribute('position', new BufferAttribute(new Float32Array(segments.length * 6), 3))
    return built
  }, [segments])
  useFrame((_, delta) => {
    const playback = useBranchingPlayback.getState()
    playback.tickGrowth(delta / GROWTH_SECONDS)
    const shown = growthProgress(segments, mode, useBranchingPlayback.getState().growthTime)
    writeTubes(geometry.getAttribute('position').array, tubeSegments(shown), sides)
    geometry.getAttribute('position').needsUpdate = true
    const linePositions = lines.getAttribute('position').array
    shown.forEach(({ from, to }, index) => linePositions.set([...from, ...to], index * 6))
    lines.getAttribute('position').needsUpdate = true
  })
  return look === 'Solid'
    ? <mesh geometry={geometry} frustumCulled={false}><meshStandardMaterial color={readToken(ASSET_COLOUR)} roughness={1} flatShading side={2} /></mesh>
    : <lineSegments geometry={lines} frustumCulled={false}><lineBasicMaterial color={readToken('--ink')} /></lineSegments>
}

export function GrowthScene() {
  const mode = useSceneStore((state) => state.params.branchingGrowthMode)
  const showFull = useSceneStore((state) => state.params.branchingShowFull)
  const look = useSceneStore((state) => state.params.branchingLook)
  const segments = useAssetSegments()
  return <>
    <Stage />
    {showFull && <SkeletonLines segments={segments} token="--line" />}
    <GrowingAsset segments={segments} mode={mode} look={look} />
  </>
}

// Reads the camera's distance every frame and publishes it only when the
// rounded value changes, so the panel does not redraw on every frame.
function DistanceProbe({ target }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const request = useBranchingPlayback((state) => state.distanceRequest)
  useEffect(() => {
    if (!request || !controls) return
    const offset = camera.position.clone().sub(controls.target)
    offset.setLength(request.value)
    camera.position.copy(controls.target).add(offset)
    controls.update()
  }, [request, camera, controls])
  useFrame(() => {
    const distance = Math.round(camera.position.distanceTo({ x: target[0], y: target[1], z: target[2] }) * 10) / 10
    if (useBranchingPlayback.getState().distance !== distance) useBranchingPlayback.getState().setDistance(distance)
  })
  return null
}

export function LodScene() {
  const view = useSceneStore((state) => state.params.branchingLodView)
  const lock = useSceneStore((state) => state.params.branchingLodLock)
  const near = useSceneStore((state) => state.params.branchingNearDistance)
  const far = useSceneStore((state) => state.params.branchingFarDistance)
  const distance = useBranchingPlayback((state) => state.distance)
  const segments = useAssetSegments()
  const levels = useMemo(() => buildLodSet(segments), [segments])
  const height = Math.max(...segments.map((segment) => segment.to[1]))
  const chosen = lock === 'Auto' ? chooseLod(distance, near, far) : Number(lock.slice(-1))
  useEffect(() => { useBranchingPlayback.getState().setLodReadout({ level: chosen, triangles: levels[chosen].triangles }) }, [chosen, levels])
  return <>
    <Stage />
    <DistanceProbe target={[0, height / 2, 0]} />
    {view === 'Side by side'
      ? levels.map((level, index) => (
        <SolidMesh key={level.level} segments={level.segments} sides={level.sides} position={[(index - 1) * LOD_SPACING, 0, 0]} />
      ))
      : levels.map((level) => <SolidMesh key={level.level} segments={level.segments} sides={level.sides} visible={level.level === chosen} />)}
  </>
}
