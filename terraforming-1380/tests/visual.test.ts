import assert from 'node:assert/strict'
import test from 'node:test'
import { Color, Mesh, MeshStandardMaterial, ShaderLib, type Object3D } from 'three'
import { palette } from '../src/config/palette'
import { resourceColors } from '../src/config/resourceColors'
import { tuning } from '../src/config/tuning'
import { buildAtmospherePoints, createSurfaceRadius } from '../src/render/atmosphere'
import { createRobot, type RobotRole } from '../src/render/models/robots'
import { antennaColors, antennaGeometries, branchGeometries, crystalClusterGeometry, lichenGeometries } from '../src/render/models/surfaceModels'
import { createTerrainMaterial, showWorkArea } from '../src/render/terrainMaterial'

// Every hex string anywhere in the palette, as normalized three.js colors.
function paletteColors() {
  const found = new Set<string>()
  const visit = (value: unknown) => {
    if (typeof value === 'string' && value.startsWith('#')) found.add(new Color(value).getHexString())
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(palette)
  return found
}

function meshColors(object: Object3D) {
  const colors: string[] = []
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const material = child.material as MeshStandardMaterial
    colors.push(material.color.getHexString())
    if (material.emissive && material.emissiveIntensity > 0 && material.emissive.getHex() !== 0) colors.push(material.emissive.getHexString())
  })
  return colors
}

// D-027: the palette is the single source; resource colors keep their existing values.
test('palette reuses the resource colors and the agreed atmosphere color', () => {
  assert.equal(palette.resource, resourceColors)
  assert.equal(palette.atmosphere, '#9fadb5')
  assert.equal(tuning.visual.atmosphere.strength, 0.23)
})

test('every robot and surface model is colored only from the palette', () => {
  const allowed = paletteColors()
  const check = (name: string, color: string) =>
    assert.ok(allowed.has(new Color(color).getHexString()), `${name} uses ${color}, which is not in the palette`)
  for (const role of ['miner', 'gardener', 'rigger', 'builder'] as RobotRole[]) {
    for (const color of meshColors(createRobot[role]().object)) check(role, `#${color}`)
  }
  for (const { color } of [...lichenGeometries('1380'), ...branchGeometries('1380')]) check('plant', color)
  Object.values(antennaColors).forEach((color) => check('antenna', color))
})

test('robots keep their agreed silhouettes cheap to draw and their lights follow state', () => {
  for (const role of ['miner', 'gardener', 'rigger', 'builder'] as RobotRole[]) {
    const robot = createRobot[role]()
    let meshes = 0
    robot.object.traverse((child) => { if (child instanceof Mesh) meshes += 1 })
    assert.ok(meshes <= 10, `${role} draws ${meshes} meshes`)
    robot.setState('blocked')
    robot.update(1)
    const lamp = robot.object.children
      .flatMap((child) => child instanceof Mesh ? [child.material as MeshStandardMaterial] : [])
      .find((material) => material.emissive.getHex() !== 0)
    assert.equal(lamp?.color.getHexString(), new Color(palette.state.blocked).getHexString())
    robot.dispose()
  }
})

test('plants grow by level and every template part has geometry', () => {
  const vertices = (growth: number) => branchGeometries('seed', 0.24, growth)
    .reduce((sum, { geometry }) => sum + geometry.attributes.position.count, 0)
  assert.ok(vertices(0.4) < vertices(0.7) && vertices(0.7) < vertices(1))
  assert.equal(branchGeometries('seed', 0.24, 0.4).some(({ color }) => color === palette.vegetation.tip), false)
  for (const geometry of Object.values(antennaGeometries())) assert.ok(geometry.attributes.position.count > 0)
  const crystals = crystalClusterGeometry('mineral-0')
  assert.ok(crystals.boundingSphere && crystals.boundingSphere.radius > 0.05)
})

// D-027 atmosphere C4: seeded, irregular, and always above the initial surface.
test('atmosphere points are seeded and hug the initial terrain', () => {
  const surfaceRadius = createSurfaceRadius('1380')
  const first = buildAtmospherePoints('1380', surfaceRadius)
  const again = buildAtmospherePoints('1380', surfaceRadius)
  assert.deepEqual(first.inner, again.inner)
  const total = (first.inner.length + first.outer.length) / 3
  assert.equal(total, tuning.visual.atmosphere.points)
  for (const positions of [first.inner, first.outer]) {
    for (let i = 0; i < positions.length; i += 3) {
      const length = Math.hypot(positions[i], positions[i + 1], positions[i + 2])
      const direction: [number, number, number] = [positions[i] / length, positions[i + 1] / length, positions[i + 2] / length]
      assert.ok(length >= surfaceRadius(direction) + tuning.visual.atmosphere.lift - 1e-4)
    }
  }
  const other = buildAtmospherePoints('1381')
  assert.notDeepEqual(other.inner.slice(0, 30), first.inner.slice(0, 30))
})

// Guard the shader patch: a three.js update that renames a chunk would silently drop the style.
test('terrain material patches every shader chunk it relies on', () => {
  const material = createTerrainMaterial([])
  const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
  material.onBeforeCompile(shader as never, undefined as never)
  assert.match(shader.vertexShader, /vTerrainPosition = /)
  assert.match(shader.fragmentShader, /contourPixels\(rings\)/)
  assert.match(shader.fragmentShader, /uAtmoColor, uRim/)
  assert.match(shader.fragmentShader, /totalEmissiveRadiance \+= glowTint/)
  const uniforms = shader.uniforms as Record<string, { value: unknown }>
  showWorkArea({ center: [0, 2, 0], radius: 1.2 })
  assert.equal(uniforms.uAreaOn.value, 1)
  assert.equal(uniforms.uAreaRadius.value, 1.2)
  showWorkArea(null)
  assert.equal(uniforms.uAreaOn.value, 0)
})
