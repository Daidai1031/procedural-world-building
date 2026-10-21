import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { resourceColors } from '../config/resourceColors'
import { tuning } from '../config/tuning'
import { palette } from '../config/palette'
import { crystalClusterGeometry } from '../render/models/surfaceModels'
import { createDistanceSignalMaterial } from '../render/distanceSignalMaterial'
import { detectedClusters, isResourceExposed } from '../tools/detector'
import type { PlanetWorld } from '../world/planet'
import type { ResourceCluster } from '../world/resourceClusters'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'

const colors = resourceColors

function localWireframe(world: PlanetWorld, center: [number, number, number], radius: number) {
  const lines: number[] = []
  const half = VOXEL_WORLD_SIZE / 2
  for (const { mesh } of world.chunks) {
    const p = mesh.positions
    for (let i = 0; i < p.length; i += 9) {
      const x = (p[i] + p[i + 3] + p[i + 6]) / 3
      const y = (p[i + 1] + p[i + 4] + p[i + 7]) / 3 - half
      const z = (p[i + 2] + p[i + 5] + p[i + 8]) / 3
      if (Math.hypot(x - center[0], y - center[1], z - center[2]) > radius + 0.14) continue
      const a = [p[i], p[i + 1] - half, p[i + 2]]
      const b = [p[i + 3], p[i + 4] - half, p[i + 5]]
      const c = [p[i + 6], p[i + 7] - half, p[i + 8]]
      lines.push(...a, ...b, ...b, ...c, ...c, ...a)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3))
  return geometry
}

function ResourceMarker({ cluster, material, buried }: {
  cluster: ResourceCluster
  material?: ReturnType<typeof createDistanceSignalMaterial>
  buried: boolean
}) {
  // D-027 resource B: a Mineral reads as a small crystal cluster, sized to the target's radius. Visual only.
  const crystals = useMemo(() => crystalClusterGeometry(cluster.id), [cluster])
  useEffect(() => () => crystals?.dispose(), [crystals])
  const crystalScale = (cluster.radius * 1.6) / (crystals?.boundingSphere?.radius ?? 1)
  return (
    <mesh position={cluster.position} scale={crystalScale} renderOrder={buried ? 11 : 0} raycast={() => null}
      material={material}>
      <primitive object={crystals} attach="geometry" />
      {!buried && <meshStandardMaterial color={colors.mineral} roughness={0.4} metalness={0.35}
        emissive={palette.crystalGlow} emissiveIntensity={0.4} />}
    </mesh>
  )
}

export function DetectorView({ world, clusters: allClusters, collectedIds, center, radius, active, meshRevision }: {
  world: PlanetWorld
  clusters: ResourceCluster[]
  collectedIds: string[]
  center: [number, number, number] | null
  radius: number
  active: boolean
  meshRevision: number
}) {
  const clusters = useMemo(() => allClusters.filter(({ id }) => !collectedIds.includes(id)),
    [allClusters, collectedIds])
  const exposed = useMemo(() => clusters.filter((cluster) => isResourceExposed(world, cluster)),
    [clusters, world, meshRevision])
  const buried = useMemo(() => active && center
    ? detectedClusters(clusters, center, radius).filter((cluster) => !isResourceExposed(world, cluster))
    : [], [active, center, radius, clusters, world, meshRevision])
  const wireframe = useMemo(() => active && center ? localWireframe(world, center, radius) : null,
    [world, center, radius, active, meshRevision])
  const wireMaterial = useMemo(() => center
    ? createDistanceSignalMaterial(center, radius, tuning.detector.fadeWidth, '#66645f', 0.38)
    : null, [center, radius])
  const signalMaterial = useMemo(() => center
    ? createDistanceSignalMaterial(center, radius, tuning.detector.fadeWidth, colors.mineral, 0.96)
    : null, [center, radius])

  useEffect(() => () => wireframe?.dispose(), [wireframe])
  useEffect(() => () => wireMaterial?.dispose(), [wireMaterial])
  useEffect(() => () => signalMaterial?.dispose(), [signalMaterial])

  return (
    <>
      {exposed.map((cluster) => <ResourceMarker key={cluster.id} cluster={cluster} buried={false} />)}
      {active && wireframe && wireMaterial &&
        <lineSegments geometry={wireframe} material={wireMaterial} renderOrder={10} raycast={() => null} />}
      {active && signalMaterial && buried.map((cluster) =>
        <ResourceMarker key={cluster.id} cluster={cluster} material={signalMaterial} buried />)}
    </>
  )
}
