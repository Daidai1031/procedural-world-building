import { create } from 'zustand'
import { tuning } from '../config/tuning'
import { generateResourceClusters, type ResourceCluster } from '../world/resourceClusters'
import type { FlattenOrientation } from '../world/flattenPlane'

export type ToolId = 'terrain' | 'detector' | 'scanner' | 'deepScanner' | 'wideDrill' | 'bioSeeder' | 'stabilizer'
export type ModuleId = 'deepScanner' | 'wideDrill' | 'bioSeeder' | 'stabilizer'
export type TerrainMode = 'dig' | 'add' | 'flatten'

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
    historicalSignificance: number
  }
  planetRemaining: number
  hidden: {
    planetaryMemory: number
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
  }
  canister: { amount: number; capacity: number }
  minerals: Record<string, number>
  discoveries: { artifactIds: string[]; lifeClusterIds: string[] }
  resourceClusters: ResourceCluster[]
  collectedIds: string[]
  detector: { center: [number, number, number] | null; radius: number }
  flags: {
    archive1379Found: boolean
    echoArrayRepaired: boolean
    emergencyExtractionUsed: boolean
  }
}

export function createInitialRunState(seed: string): RunState {
  return {
    seed,
    mode: 'orbital',
    budget: { workCyclesRemaining: tuning.budget.workCycles, energy: tuning.budget.energyTotal },
    metrics: { capital: 0, biosphere: 100, developmentReadiness: 0, stability: 100, historicalSignificance: 0 },
    planetRemaining: 1,
    hidden: {
      planetaryMemory: 0,
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
    },
    canister: { amount: 0, capacity: tuning.canister.capacity },
    minerals: {},
    discoveries: { artifactIds: [], lifeClusterIds: [] },
    resourceClusters: generateResourceClusters(seed),
    collectedIds: [],
    detector: { center: null, radius: tuning.detector.radius },
    flags: { archive1379Found: false, echoArrayRepaired: false, emergencyExtractionUsed: false },
  }
}

export function createRunStore(seed: string) {
  return create<RunState>()(() => createInitialRunState(seed))
}
