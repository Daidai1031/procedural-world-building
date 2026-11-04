import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, InstancedBufferGeometry, type Material } from 'three'
import { tuning } from '../config/tuning'
import { furShells } from '../render/terrainMaterial'
import type { PlanetWorld } from '../world/planet'

type Chunk = PlanetWorld['chunks'][number]

// One instanced draw per chunk: the same triangles, once per shell. The shader reads gl_InstanceID as the shell's height.
function ChunkShells({ mesh, material, shells: count }: { mesh: Chunk['mesh']; material: Material; shells: number }) {
  const geometry = useMemo(() => {
    const shells = new InstancedBufferGeometry()
    shells.setAttribute('position', new BufferAttribute(mesh.positions, 3))
    shells.setAttribute('normal', new BufferAttribute(mesh.normals, 3))
    shells.setAttribute('aEdit', new BufferAttribute(mesh.edits, 3))
    shells.instanceCount = count
    return shells
  }, [mesh, count])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} raycast={() => null} frustumCulled={false} />
}

// SUR-08: hair only on chunks near enough to read as hair. Far chunks show the sheen on the hide underneath.
// SUR-14: shells are the most expensive thing the game draws, so a machine that cannot keep up gets fewer, then none.
export function FurShells({ world, material }: { world: PlanetWorld; material: Material }) {
  const [shells, setShells] = useState(furShells.value)
  const load = useRef({ seconds: 0, frames: 0 })
  useFrame((_, delta) => {
    const { slowFrame, window, minShells } = tuning.surface.fur
    load.current.seconds += Math.min(delta, 0.25)
    load.current.frames += 1
    if (load.current.seconds < window) return
    const slow = load.current.seconds / load.current.frames > slowFrame
    load.current = { seconds: 0, frames: 0 }
    if (!slow || furShells.value === 0) return
    furShells.value = furShells.value > minShells ? furShells.value / 2 : 0
    setShells(furShells.value)
  })
  if (shells === 0) return null
  return <>
    {world.chunks.filter(({ mesh, level }) => mesh.positions.length > 0 && level <= tuning.surface.fur.maxLevel).map(({ key, version, mesh }) =>
      <ChunkShells key={`${key}-${version}`} mesh={mesh} material={material} shells={shells} />)}
  </>
}
