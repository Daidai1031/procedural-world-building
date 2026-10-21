// TERR-02, TERR-03, DET-01/04: mirrored in docs/tuning.md; OQ-10 remains provisional.
export const tuning = {
  // Prototype balance; credits, kW, and credits per kW-minute.
  economy: { startingCapital: 0, bankruptcyLimit: -50, mineralPrice: 40, electricityRate: 0.55, manualTerrainRate: 0.02,
    power: { miner: 6, gardener: 3, builder: 8 } },
  ecology: { baseline: 60, plantValue: 0.6, lifeDisturbance: 2, terrainLoss: 60, preparedSamples: 10000 },
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
  // PLN-02, D-041: each signal planet draws size, relief and abundance independently; the home planet keeps `home`.
  // Radius and relief are fractions of the voxel world size; abundance multiplies the cluster counts below.
  planets: {
    home: { radius: 0.34, relief: 0.16, minerals: 1, life: 1 },
    radius: [0.22, 0.36], relief: [0.06, 0.2], minerals: [0.4, 2], life: [0.3, 2],
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
  // Broadcasting: each pulse lasts `pulseSeconds`; distant planets start to appear after `planetsAfter` broadcasts.
  // S1/S2, D-042: cave residents. Lengths are world units, durations are resident ticks (30 per second).
  residents: {
    tickRate: 30,
    // Initial burrows: groups of pockets under the surface, each with a slanted tunnel to the open air.
    burrows: { groups: 2, perGroup: 3, occupiedPerGroup: 2, groupSpread: 0.55, pocketRadius: 0.21, tunnelRadius: 0.14, depth: 0.6, slant: 0.5, minGap: 0.6 },
    // HAB-01: a home has room for the body, rock on most sides, and an opening that leads outside.
    shelter: { clearance: 0.05, rayLength: 0.6, rayStep: 0.08, minEnclosure: 0.7, accessReach: 1.6, accessNodes: 3000 },
    // HAB-02: every terrain edit adds local disturbance that fades each tick.
    disturbance: { radius: 0.9, manual: 1.4, robot: 0.3, cap: 3, decay: 0.97, merge: 0.3, maxSources: 32 },
    retreatLevel: 0.5, quietLevel: 0.15, quietTicks: 75, sustainedTicks: 240,
    checkEvery: 15, reconsiderEvery: 300, waitRetry: 90,
    search: { radius: 3.0, candidateLimit: 64, candidateMerge: 0.18, occupiedRadius: 0.3 },
    cooldownTicks: 600, advantage: 0.12, companionRadius: 0.9, companionBonus: 0.04, distanceCost: 0.05,
    speed: 0.012, surfaceLift: 0.09, pathStep: 0.07, bodyRadius: 0.1,
  },
  signal: { pulseSeconds: 3.2, planetsAfter: 3, maxPlanets: 5, planetFadeSeconds: 4 },
  // D-043: Autopilot hands the whole planet to the crew. Each robot sweeps `sectors` work areas of `radius` in turn;
  // after a lap with no work it rests `restTicks`, doubling each fruitless lap up to `maxRestFactor` times. Builders
  // instead share one queue of sectors, leave each after `builderJobsPerSector` jobs and retire when the queue is empty. Gardeners and Builders wait while funds sit below `holdBelow`
  // and resume above `resumeAbove`. Signals go out every `broadcastEvery` ticks while antennas stand.
  autopilot: {
    maxPerKind: 4, defaults: { miner: 2, gardener: 1, builder: 1 },
    miner: { sectors: 6, radius: 2.4 }, gardener: { sectors: 6, radius: 2.4 }, builder: { sectors: 12, radius: 1.4 },
    restTicks: 900, maxRestFactor: 16, builderJobsPerSector: 15, holdBelow: -20, resumeAbove: -10, broadcastEvery: 600,
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
