import { useEffect, useMemo } from 'react'
import { MeshBasicMaterial, SphereGeometry } from 'three'
import { readToken } from '../../../styles/readToken.js'
import { useSceneStore } from '../../../store/sceneStore.js'
import { csgSettingsFromParams } from './params.js'
import { CSG_SPHERE } from './voxelMath.js'
import { VoxelVolume } from './VoxelTerrainDemo.jsx'

// The outline of one operand field, so the learner can see where it sits while
// the cubes show what the operations left behind. The words that explain it live
// in the step's scene.legend.
export function SphereOutline({ sphere, colorToken }) {
  const assets = useMemo(() => ({
    geometry: new SphereGeometry(sphere.radius, 28, 18),
    material: new MeshBasicMaterial({ color: readToken(colorToken), wireframe: true, transparent: true, opacity: 0.35 }),
  }), [sphere, colorToken])

  useEffect(() => () => {
    assets.geometry.dispose()
    assets.material.dispose()
  }, [assets])

  return <mesh geometry={assets.geometry} material={assets.material} position={[sphere.x, sphere.y, sphere.z]} />
}

export default function VoxelCsgDemo() {
  const params = useSceneStore((state) => state.params)
  const { shape, resolution } = csgSettingsFromParams(params)

  return (
    <VoxelVolume shape={shape} resolution={resolution}>
      <SphereOutline sphere={CSG_SPHERE} colorToken="--clay" />
    </VoxelVolume>
  )
}
