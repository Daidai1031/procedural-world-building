// TERR-02, TERR-03, DET-01/04: mirrored in docs/tuning.md; OQ-10 remains provisional.
export const tuning = {
  grid: { resolution: 64 },
  chunk: { size: 16 },
  lod: { maxLevels: 3, fullDetailDistance: 7, bandWidth: 2.5 },
  brush: { radius: { min: 0.18, default: 0.38, max: 0.9, step: 0.08 } },
  flatten: { innerFraction: 0.75 },
  remesh: { timeBudgetMs: 6 },
  detector: { radius: 0.95, fadeWidth: 0.24 },
  // Resource glow leaking through the terrain surface, faded by world-space distance to each target.
  glow: { radius: 0.62, albedoMix: 0.75, emissive: 0.35 },
  // D-027: agreed visual style. Values mirror the component board and docs/tuning.md.
  visual: {
    contour: { spacing: 0.045, majorEvery: 5, heightRange: 0.3 },
    workArea: { innerSpacingFactor: 0.5 },
    atmosphere: {
      strength: 0.23,
      rim: 0.35,
      points: 4200,
      floorChance: 0.15,
      lift: 0.02,
      falloff: { base: 0.05, dense: 0.24 },
      haloOpacity: 0.6,
      drift: { inner: 0.03, outer: 0.012 },
    },
  },
  gen: {
    cluster: { mineral: { count: 14 }, life: { count: 8 }, memory: { count: 6 } },
    surfaceTeachingTargets: 3,
  },
  // AUT-01–12: fixed 30 Hz simulation; distances are world units, durations are ticks.
  miner: {
    tickRate: 30, maxStepsPerFrame: 3,
    scanRange: 2.6, scanTicks: 12, collectTicks: 10,
    hoverHeight: 0.4, travelSpeed: 0.03, arriveDistance: 0.06,
    digStep: 0.018, digRadius: 0.2,
    blockedTicks: 45, maxMoveTicks: 900, maxDigTicks: 600,
    area: { min: 0.6, default: 1.6, max: 2.4, step: 0.1 },
  },
  // AUT-14–16: the Gardener places plants and antennas on terrain it judges suitable; plants grow and spread.
  gardener: {
    scanTicks: 12, workTicks: 24, hoverHeight: 0.4, travelSpeed: 0.03, arriveDistance: 0.06, maxMoveTicks: 900,
    candidates: 30, blockedScans: 3,
    pattern: ['plant', 'plant', 'antenna'],
    plantMaxSlope: 0.35, antennaMaxSlope: 0.6,
    area: { min: 0.6, default: 1.6, max: 2.4, step: 0.1 },
  },
  // D-026: the Builder alternates flattening high ground and filling low ground toward one level.
  builder: {
    scanTicks: 12, workTicks: 18, hoverHeight: 0.4, travelSpeed: 0.03, arriveDistance: 0.06, maxMoveTicks: 900,
    candidates: 40, levelSamples: 60, blockedScans: 3,
    pattern: ['flatten', 'fill'],
    tolerance: 0.06, flattenRadius: 0.35, fillRadius: 0.18, fillCost: 28,
    structureMargin: 0.15, minerClearance: 0.45,
    area: { min: 0.6, default: 1.2, max: 2.4, step: 0.1 },
  },
  structures: {
    plantSpacing: 0.25, antennaSpacing: 0.9, mixedClearance: 0.3, anchorLift: 0.14,
    maxPlants: 60, maxAntennas: 8,
    stages: 3, growTicks: 300, spreadTicks: 450, spreadRadius: 0.7, spreadAttempts: 6,
  },
  // Spec §3 initialization only; M0 implements no budget or canister rules.
  budget: { energyTotal: 1000, workCycles: 30 },
  canister: { capacity: 300 },
} as const
