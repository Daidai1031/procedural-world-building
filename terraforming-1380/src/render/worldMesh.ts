import { useEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, type Mesh } from 'three'
import type { PlanetWorld } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'

// SYS-02: another world is drawn from its own current chunk meshes merged into one geometry, never a stand-in sphere.
export function mergeChunks(world: PlanetWorld) {
  const meshes = world.chunks.map(({ mesh }) => mesh).filter(mesh => mesh.positions.length > 0)
  const length = meshes.reduce((sum, mesh) => sum + mesh.positions.length, 0)
  const positions = new Float32Array(length), normals = new Float32Array(length)
  let offset = 0
  for (const mesh of meshes) {
    positions.set(mesh.positions, offset)
    normals.set(mesh.normals, offset)
    offset += mesh.positions.length
  }
  for (let i = 1; i < length; i += 3) positions[i] -= VOXEL_WORLD_SIZE / 2
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.computeBoundingSphere()
  return geometry
}

// SYS-04: one comparison of the mesh version per frame; the geometry is rebuilt only when the world really changed.
export function useWorldGeometry(world: PlanetWorld, mesh: RefObject<Mesh | null>) {
  const version = useRef(-1)
  useEffect(() => { version.current = -1 }, [world])
  useEffect(() => { const owned = mesh.current; return () => owned?.geometry.dispose() }, [mesh])
  useFrame(() => {
    if (!mesh.current || world.meshVersion === version.current) return
    version.current = world.meshVersion
    const previous = mesh.current.geometry
    mesh.current.geometry = mergeChunks(world)
    previous.dispose()
  })
}
