import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { palette } from '../../config/palette'

// D-027: shared look for the voxel models. Rough, unlit-looking off-white plastic, graphite metal parts.
const finish: Record<string, { roughness: number; metalness: number }> = {
  [palette.robot.body]: { roughness: 0.5, metalness: 0 },
  [palette.robot.graphite]: { roughness: 0.65, metalness: 0.15 },
  [palette.robot.charcoal]: { roughness: 0.55, metalness: 0.2 },
}

const materials = new Map<string, MeshStandardMaterial>()
export function modelMaterial(color: string) {
  let material = materials.get(color)
  if (!material) {
    material = new MeshStandardMaterial({ color, ...(finish[color] ?? { roughness: 0.75, metalness: 0 }) })
    materials.set(color, material)
  }
  return material
}

// A status light owns its own material so each robot can blink independently.
export function lampMaterial() {
  return new MeshStandardMaterial({ color: palette.state.move, emissive: palette.state.move, emissiveIntensity: 1, roughness: 0.6 })
}

// Collects unit cubes on a grid and merges them into one mesh per material, so a ~200-cube robot
// costs a handful of draw calls.
export class VoxelBuilder {
  private readonly parts = new Map<MeshStandardMaterial, BufferGeometry[]>()
  constructor(readonly cell: number) {}

  cube(x: number, y: number, z: number, material: MeshStandardMaterial, scale = 0.97) {
    const size = this.cell * scale
    const geometry = new BoxGeometry(size, size, size).translate(x * this.cell, y * this.cell, z * this.cell)
    const list = this.parts.get(material) ?? []
    list.push(geometry)
    this.parts.set(material, list)
    return this
  }

  build(group = new Group()) {
    for (const [material, geometries] of this.parts) {
      const mesh = new Mesh(mergeGeometries(geometries), material)
      mesh.castShadow = true
      group.add(mesh)
      geometries.forEach((geometry) => geometry.dispose())
    }
    this.parts.clear()
    return group
  }
}

// The shared hollow orb all three robots are built on: radius 3.7 cells, 2.6 inner, a band at the
// equator in the role color, and a 2 × 2 status light facing +X.
export function orbShell(builder: VoxelBuilder, band: MeshStandardMaterial, lamp: MeshStandardMaterial) {
  for (let x = -4; x <= 4; x += 1) for (let y = -4; y <= 4; y += 1) for (let z = -4; z <= 4; z += 1) {
    const distance = Math.hypot(x, y, z)
    if (distance > 3.7 || distance < 2.6) continue
    const eye = x >= 3 && (y === 0 || y === 1) && (z === 0 || z === -1)
    builder.cube(x, y, z, eye ? lamp : y === 0 ? band : modelMaterial(palette.robot.body))
  }
  return builder
}

export function disposeModel(object: Group) {
  object.traverse((child) => {
    if (child instanceof Mesh) child.geometry.dispose()
  })
}
