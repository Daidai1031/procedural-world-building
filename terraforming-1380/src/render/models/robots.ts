import { Group, type MeshStandardMaterial } from 'three'
import { palette, type RobotStateColor } from '../../config/palette'
import { disposeModel, lampMaterial, modelMaterial, orbShell, VoxelBuilder } from './voxel'

export type RobotRole = 'miner' | 'gardener' | 'rigger' | 'builder'

// AUT-10: one status light. `idle` is a dim steady scan-white light for waiting, paused or unstarted robots.
export type RobotLight = RobotStateColor | 'idle'

export interface RobotModel {
  role: RobotRole
  object: Group
  /** Height of the body center above the ground while hovering, in world units. */
  hoverHeight: number
  /** Bounding sphere radius used for clearance checks, in world units. */
  collisionRadius: number
  setState(state: RobotLight): void
  update(seconds: number): void
  dispose(): void
}

const CELL = 0.02

function lightLevel(state: RobotLight, seconds: number) {
  if (state === 'idle') return 0.35
  if (state === 'scan') return 0.4 + 0.6 * Math.abs(Math.sin(seconds * 4))
  if (state === 'work') return Math.floor(seconds * 8) % 2 ? 1 : 0.15
  if (state === 'plant') return 0.6 + 0.4 * Math.sin(seconds * 3)
  if (state === 'blocked') return Math.floor(seconds * 1.5) % 2 ? 1 : 0.1
  return 1
}

function robot(role: RobotRole, hoverHeight: number, collisionRadius: number,
  build: (object: Group, lamp: MeshStandardMaterial) => (seconds: number, state: RobotLight) => void): RobotModel {
  const object = new Group()
  object.name = role
  const lamp = lampMaterial()
  const animate = build(object, lamp)
  let state: RobotLight = 'idle'
  const model: RobotModel = {
    role, object, hoverHeight, collisionRadius,
    setState(next) {
      state = next
      const color = palette.state[next === 'idle' ? 'scan' : next]
      lamp.color.set(color)
      lamp.emissive.set(color)
    },
    update(seconds) {
      lamp.emissiveIntensity = 1.4 * lightLevel(state, seconds)
      animate(state === 'blocked' ? 0 : seconds, state)
    },
    dispose() {
      disposeModel(object)
      lamp.dispose()
    },
  }
  model.setState('idle')
  return model
}

// D-027 Miner E: hollow voxel orb, tilted ring of 26 cubes, stepped drill below.
export function createMiner() {
  return robot('miner', 0.15, 0.1, (object, lamp) => {
    const graphite = modelMaterial(palette.robot.graphite)
    const body = orbShell(new VoxelBuilder(CELL), modelMaterial(palette.robot.band.miner), lamp)
    for (const [x, z] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) body.cube(x, -4.3, z, graphite)
    body.cube(0, -5.3, 0, graphite, 0.8).cube(0, -6.1, 0, graphite, 0.5).build(object)
    const tilt = new Group()
    tilt.rotation.z = 0.28
    const spin = new Group()
    tilt.add(spin)
    object.add(tilt)
    const ring = new VoxelBuilder(0.013)
    for (let i = 0; i < 26; i += 1) {
      const angle = (i / 26) * Math.PI * 2
      ring.cube(Math.cos(angle) * 0.106 / 0.013, 0, Math.sin(angle) * 0.106 / 0.013,
        modelMaterial(i % 6 === 0 ? palette.robot.charcoal : palette.robot.graphite))
    }
    ring.build(spin)
    return (seconds) => { spin.rotation.y = seconds * 1.2 }
  })
}

// D-027 Gardener G3: the same orb with a seed pannier behind it and two voxel arms that move while working.
export function createGardener() {
  return robot('gardener', 0.15, 0.13, (object, lamp) => {
    const graphite = modelMaterial(palette.robot.graphite)
    const moss = modelMaterial(palette.robot.band.gardener)
    const body = orbShell(new VoxelBuilder(CELL), moss, lamp)
    body.cube(0, -4.3, 0, graphite).cube(0, -5.2, 0, moss, 0.75).cube(0, -5.9, 0, moss, 0.45)
    for (let x = -6; x <= -4; x += 1) for (let y = -2; y <= 2; y += 1) for (let z = -2; z <= 2; z += 1) {
      if (x === -4 && Math.abs(y) < 2 && Math.abs(z) < 2) continue
      if (y === 2 && x !== -6 && Math.abs(z) < 2) { body.cube(x, y, z, modelMaterial(palette.vegetation.tip), 0.8); continue }
      body.cube(x, y, z, Math.abs(z) === 2 || x === -6 ? graphite : modelMaterial(palette.robot.body))
    }
    body.build(object)
    const arms = [-1, 1].map((side) => {
      const arm = new Group()
      arm.position.set(0, -0.02, side * 0.08)
      new VoxelBuilder(CELL).cube(0, 0, 0, graphite).cube(1, -0.6, 0, graphite).cube(2, -1.4, 0, graphite)
        .cube(2.6, -2.3, 0, moss, 0.7).build(arm)
      object.add(arm)
      return arm
    })
    return (seconds, state) => {
      const working = state === 'plant' || state === 'work'
      arms.forEach((arm, index) => { arm.rotation.z = working ? Math.sin(seconds * 6 + index * 2) * 0.35 - 0.2 : -0.1 })
    }
  })
}

// D-057 Rigger: the same orb on a graphite skid with a mast and a small dish on top that turns while it works.
export function createRigger() {
  return robot('rigger', 0.16, 0.13, (object, lamp) => {
    const graphite = modelMaterial(palette.robot.graphite)
    const body = orbShell(new VoxelBuilder(CELL), modelMaterial(palette.robot.band.rigger), lamp)
    for (const x of [-2, 2]) for (const z of [-4, 4]) body.cube(x, -4.3, z, graphite)
    body.cube(0, -4.3, 0, graphite).build(object)
    const mast = new VoxelBuilder(CELL)
    for (let y = 4; y <= 8; y += 1) mast.cube(0, y, 0, graphite, y === 8 ? 0.7 : 1)
    mast.build(object)
    const head = new Group()
    head.position.y = 9 * CELL
    new VoxelBuilder(CELL).cube(0, 0, 0, modelMaterial(palette.antenna.lamp), 0.7)
      .cube(1, 0.4, 0, modelMaterial(palette.robot.body)).cube(1.7, 0.8, 0, modelMaterial(palette.robot.body), 0.8)
      .cube(-1, 0.4, 0, modelMaterial(palette.robot.body)).cube(-1.7, 0.8, 0, modelMaterial(palette.robot.body), 0.8).build(head)
    object.add(head)
    return (seconds, state) => { head.rotation.y = state === 'work' ? seconds * 2.4 : state === 'move' ? seconds * 0.6 : head.rotation.y }
  })
}

// D-027 Builder B1: the same orb on two ochre brackets carrying a voxel roller that turns while moving or flattening.
export function createBuilder() {
  return robot('builder', 0.17, 0.12, (object, lamp) => {
    const ochre = modelMaterial(palette.robot.band.builder)
    const body = orbShell(new VoxelBuilder(CELL), ochre, lamp)
    for (const z of [-5, 5]) for (let y = -3; y >= -6; y -= 1) body.cube(0, y, z, ochre)
    body.build(object)
    const drum = new Group()
    drum.position.y = -6 * CELL
    const roller = new VoxelBuilder(CELL)
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2
      for (let z = -4; z <= 4; z += 1) {
        roller.cube(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, z,
          modelMaterial(i % 2 ? palette.robot.graphite : palette.robot.charcoal), 0.95)
      }
    }
    roller.build(drum)
    object.add(drum)
    return (seconds, state) => { if (state === 'move' || state === 'work') drum.rotation.z = -seconds * 3 }
  })
}

export const createRobot: Record<RobotRole, () => RobotModel> = {
  miner: createMiner,
  gardener: createGardener,
  rigger: createRigger,
  builder: createBuilder,
}
