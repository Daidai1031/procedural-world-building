import { create } from 'zustand'
import { tuning } from '../config/tuning'
import { generateResourceClusters, type ResourceCluster } from '../world/resourceClusters'
import type { FlattenOrientation } from '../world/flattenPlane'
import { spawnRobot, type MiningRobotState } from '../systems/miner'
import { spawnGardener, type GardenerState } from '../systems/gardener'
import { spawnRigger, type RiggerState } from '../systems/rigger'
import type { Structure } from '../systems/structures'
import { spawnBuilder, type BuilderState } from '../systems/builder'
import { spawnResidents, type HabitatState } from '../systems/residents'
import type { AutopilotState } from '../systems/autopilot'
import type { Vec3 } from '../systems/geometry'
import { hashSeed } from '../world/planet'
import { emptyInventory, type Inventory } from '../systems/inventory'
import { shearPatterns, type ShearPattern } from '../content/surfaces'
import type { ResidentKind } from '../content/residents'
import type { MaterialId } from '../content/materials'
import type { Patch } from '../systems/patches'
import type { Mound } from '../systems/water'
import { emptyNav, type NavState } from '../systems/traffic'

export type ToolId = 'terrain' | 'detector' | 'scanner' | 'deepScanner' | 'wideDrill' | 'bioSeeder' | 'stabilizer' | 'auto'
export type AutoRobot = 'miner' | 'gardener' | 'rigger' | 'builder'
export type ModuleId = 'deepScanner' | 'wideDrill' | 'bioSeeder' | 'stabilizer'
export type TerrainMode = 'dig' | 'add' | 'flatten'

// Resident persistence belongs to the run store. A Home is a valid world-space surface point.
export type Home = Vec3
export type ResidentState = 'peeking' | 'hiding' | 'moving' | 'searching'
// D-068: where a creature is in its life as a visitor or a native. A creature in a train has no planet and is 'traveling'.
export type CreatureLife = 'native' | 'traveling' | 'exploring' | 'settling' | 'established' | 'homesick' | 'returning'
export type PassportKind = 'born' | 'departed' | 'arrived' | 'settling' | 'established' | 'homesick' | 'returned'
// One line of travel or settlement history. `planet` is a seed; `tick` is that planet's habitat tick at the time.
export interface PassportEntry { kind: PassportKind; planet: string; tick: number }
export interface Resident {
  /** Local key. A visitor takes its `creatureId` here on arrival so ids never clash between planets. */
  id: string
  /** D-068: globally unique, never changes, never on two planets at once. */
  creatureId: string
  species: ResidentKind
  /** The planet it was born on. */
  origin: string
  life: CreatureLife
  /** 0..1: how well its present home suits it, smoothed. 0..1: how much it has settled, which changes slowly. */
  comfort: number
  belonging: number
  /** Seeded personal taste in habitat, within ± `migration.bias`. */
  bias: number
  arrivedTick: number
  lifeTick: number
  /** The material it says would help, while it is unhappy on foreign ground. */
  request: MaterialId | null
  passport: PassportEntry[]
  size: number
  home: Home | null
  /** Set while the resident occupies a seeded burrow. One burrow holds one resident. */
  burrowId: string | null
  position: Vec3
  state: ResidentState
  path: Vec3[]
  homeValid: boolean
  peek: Vec3 | null
  quietTicks: number
  disturbedTicks: number
  lastMoveTick: number
  nextCheck: number
  /** Earliest tick for a calm surface resident to stroll or enter a free burrow. */
  nextWander: number
  searchRetries: number
}

// CLS-02: data shape only, not computed in M0.
export interface MorphologyFeatures {
  flatness: number
  elongation: number
  spikiness: number
  sphericity: number
  fragmentation: number
  holeCount: number
  holeSize: number
  throughHole: boolean
  smallHoleDensity: number
  shellHollowness: number
  regularity: number
}

// TECH-04: spec §3, including both budgets while OQ-01 is open.
export interface RunState {
  seed: string
  mode: 'orbital' | 'surface' | 'audit' | 'ending'
  budget: { workCyclesRemaining: number; energy: number }
  metrics: {
    capital: number
    biosphere: number
    developmentReadiness: number
    stability: number
  }
  planetRemaining: number
  hidden: {
    fragmentation: number
    morphology: MorphologyFeatures
    cosmicExposure: number
  }
  signal: { hasBroadcast: boolean; broadcastCount: number; exposureScore: number }
  loadout: {
    modules: [ModuleId, ModuleId]
    activeTool: ToolId
    terrainMode: TerrainMode
    flattenOrientation: FlattenOrientation
    toolSlots: ToolId[]
    // D-025: which robot Auto mode is placing and showing controls for.
    autoRobot: AutoRobot
  }
  canister: { amount: number; capacity: number }
  resourceClusters: ResourceCluster[]
  collectedIds: string[]
  detector: { center: [number, number, number] | null; radius: number }
  // AUT-01–12: robots live in the run state; simTick counts fixed simulation steps.
  robots: MiningRobotState[]
  gardeners: GardenerState[]
  riggers: RiggerState[]
  builders: BuilderState[]
  // D-043: the crew sizes and the hand-over to full automation. Kept per planet, so a frozen planet resumes as it was left.
  autopilot: AutopilotState
  // D-026/D-066: construction material this planet has produced. A Miner's dig deposits its native material, the Builder spends it.
  economy: { mineralStock: number; mineralsSold: number; revenue: number; electricitySpent: number; terrainSpent: number; bankrupt: boolean; preparedSamples: number }
  preparedSites: [number, number, number][]
  inventory: Inventory
  // D-069: local patches of shipped material. They change habitat, not terrain.
  patches: Patch[]
  // D-070: heat, roads and walkers on this planet's ground graph.
  nav: NavState
  // D-073: ground built up on an ocean that no platform holds yet.
  mounds: Mound[]
  // D-067: a spaceport is the end of a rail route. Built once per planet.
  spaceport: boolean
  // AUT-15/16: plants and antennas standing on the surface.
  structures: Structure[]
  structureCounter: number
  // D-045/D-046: sunk residents and their disturbance state are kept per planet like terrain.
  residents: Resident[]
  habitat: HabitatState
  // D-060: what the Gardener shears on a fur planet.
  shearPattern: ShearPattern
  // SUR-10: how long each robot has stayed over one spot of ice.
  heat: Record<string, { direction: Vec3; ticks: number }>
  simTick: number
}

export function createInitialRunState(seed: string): RunState {
  return {
    seed,
    mode: 'orbital',
    budget: { workCyclesRemaining: tuning.budget.workCycles, energy: tuning.budget.energyTotal },
    metrics: { capital: tuning.economy.startingCapital, biosphere: tuning.ecology.baseline, developmentReadiness: 0, stability: 100 },
    planetRemaining: 1,
    hidden: {
      fragmentation: 0,
      // Placeholder for an intact sphere, not measured morphology.
      morphology: {
        flatness: 0, elongation: 0, spikiness: 0, sphericity: 1,
        fragmentation: 0, holeCount: 0, holeSize: 0, throughHole: false,
        smallHoleDensity: 0, shellHollowness: 0, regularity: 0,
      },
      cosmicExposure: 0,
    },
    signal: { hasBroadcast: false, broadcastCount: 0, exposureScore: 0 },
    loadout: {
      modules: ['deepScanner', 'wideDrill'],
      activeTool: 'terrain',
      terrainMode: 'dig',
      flattenOrientation: 'radial',
      toolSlots: ['terrain', 'detector', 'scanner', 'deepScanner', 'wideDrill'],
      autoRobot: 'miner',
    },
    canister: { amount: 0, capacity: tuning.canister.capacity },
    resourceClusters: generateResourceClusters(seed),
    collectedIds: [],
    detector: { center: null, radius: tuning.detector.radius },
    robots: [spawnRobot(seed)],
    gardeners: [spawnGardener(seed)],
    riggers: [spawnRigger(seed)],
    builders: [spawnBuilder(seed)],
    autopilot: { enabled: false, counts: { ...tuning.autopilot.defaults }, autoBroadcast: true, holding: false, level: null, claimed: 0, lastBroadcastTick: null, crew: {} },
    economy: { mineralStock: 0, mineralsSold: 0, revenue: 0, electricitySpent: 0, terrainSpent: 0, bankrupt: false, preparedSamples: 0 },
    preparedSites: [],
    inventory: emptyInventory(),
    patches: [],
    nav: emptyNav(),
    mounds: [],
    spaceport: false,
    structures: [],
    structureCounter: 0,
    residents: spawnResidents(seed),
    habitat: { tick: 0, sources: [], candidates: [] },
    shearPattern: shearPatterns[hashSeed(`${seed}:shear`) % shearPatterns.length],
    heat: {},
    simTick: 0,
  }
}

export function createRunStore(seed: string) {
  return create<RunState>()(() => createInitialRunState(seed))
}
