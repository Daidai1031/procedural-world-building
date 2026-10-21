// TERR-02, TERR-03, DET-01/04: mirrored in docs/tuning.md; OQ-10 remains provisional.
export const tuning = {
  // Prototype balance; credits, kW, and credits per kW-minute.
  economy: { startingCapital: 0, bankruptcyLimit: -50, mineralPrice: 40, electricityRate: 0.55, manualTerrainRate: 0.02,
    power: { miner: 6, gardener: 3, rigger: 3, builder: 8 } },
  ecology: { baseline: 60, plantValue: 0.6, terrainLoss: 60, preparedSamples: 10000 },
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
    home: { radius: 0.34, relief: 0.16, minerals: 1, residents: 1, shape: 'sphere' },
    // D-056/D-058: a wide size range, and relief down to exactly smooth. Only spheres carry relief; the other solids are bare geometry.
    radius: [0.17, 0.38], relief: [0, 0.2], minerals: [0.4, 2], residents: [0.3, 2],
    smoothBelow: 0.04,
    // Share of signal planets per solid, in order of `shapes`.
    shapes: ['sphere', 'cube', 'tetra', 'donut', 'apple', 'nail'], shapeWeights: [0.25, 0.15, 0.15, 0.15, 0.15, 0.15],
    // Every size below is a multiple of the sphere radius the config asks for, chosen so the solid fits the voxel world.
    cubeHalf: 0.72, cubeRound: 0.15, tetraReach: 1.05,
    donut: { major: 0.78, minor: 0.42 },
    // The bite and the stem dimple are spheres centered just outside the apple, so no ray from the center crosses solid twice.
    apple: { bite: 0.5, biteReach: 1.12, biteDirection: [0.2, 0.25, 0.95], scallop: 0.24, dimple: 0.34 },
    nail: { scale: 0.85, shaft: 0.2, head: 0.62, headTop: 1.1, headBottom: 0.88, tip: -1.4, shoulder: -0.5 },
  },
  gen: {
    cluster: { mineral: { count: 14 } },
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
  // AUT-14–16, D-057: the Gardener plants on the flattest ground; plants grow and spread. The Rigger (below) raises antennas.
  gardener: {
    scanTicks: 12, workTicks: 24, hoverHeight: 0.4, travelSpeed: 0.03, arriveDistance: 0.06, maxMoveTicks: 900,
    candidates: 30, blockedScans: 3,
    plantMaxSlope: 0.35, antennaMaxSlope: 0.6,
    area: { min: 0.6, default: 1.6, max: 2.4, step: 0.1 },
  },
  // D-057: the Rigger raises antennas on the highest suitable ground; antennas are far apart, so it works a wider area.
  rigger: {
    scanTicks: 12, workTicks: 36, hoverHeight: 0.4, travelSpeed: 0.03, arriveDistance: 0.06, maxMoveTicks: 900,
    candidates: 40, blockedScans: 3,
    plantMaxSlope: 0.35, antennaMaxSlope: 0.6,
    area: { min: 0.6, default: 2.0, max: 2.4, step: 0.1 },
  },
  // D-050: the Builder repairs local holes first, then trims isolated bumps.
  builder: {
    scanTicks: 12, workTicks: 18, hoverHeight: 0.4, travelSpeed: 0.03, arriveDistance: 0.06, maxMoveTicks: 900,
    candidates: 40, levelSamples: 60, blockedScans: 3,
    pattern: ['fill', 'flatten'],
    surfaceProbeRadius: 0.38, surfaceProbeSamples: 8, minHoleDepth: 0.09, minBumpHeight: 0.14,
    flattenRadius: 0.35, fillRadius: 0.18, fillCost: 28,
    structureMargin: 0.15, residentMargin: 0.22, minerClearance: 0.45,
    area: { min: 0.6, default: 1.2, max: 2.4, step: 0.1 },
  },
  // Broadcasting: each pulse lasts `pulseSeconds`; distant planets start to appear after `planetsAfter` broadcasts.
  // D-045/D-046: residents sink into valid surface homes. Lengths are world units; durations are 30 Hz ticks.
  residents: {
    tickRate: 30,
    initialCount: [11, 13], size: [0.75, 1.25], minSoilDepth: 0.45, maxSlopeDeg: 25, headroom: 0.18, minHomeSpacing: 0.5,
    homeCandidates: 24, homeCandidateSamples: 128, peekLift: 0.015, hideDepth: 0.075,
    // Initial burrows: groups of pockets under the surface, each with a slanted tunnel to the open air.
    burrows: { groups: 2, perGroup: 3, occupiedPerGroup: 2, groupSpread: 0.55, pocketRadius: 0.21, tunnelRadius: 0.14, depth: 0.6, slant: 0.5, minGap: 0.6 },
    // HAB-01: a home has room for the body, rock on most sides, and an opening that leads outside.
    shelter: { clearance: 0.05, rayLength: 0.6, rayStep: 0.08, minEnclosure: 0.7, accessReach: 1.6, accessNodes: 3000 },
    // HAB-02: every terrain edit adds local disturbance that fades each tick.
    disturbance: { radius: 0.9, manual: 1.4, robot: 0.3, cap: 3, decay: 0.97, merge: 0.3, maxSources: 32 },
    retreatLevel: 0.5, quietLevel: 0.15, quietTicks: 75, sustainedTicks: 240, fleeTicks: 60,
    wanderEvery: 300, wanderArc: 0.45, burrowBonus: 0.85,
    checkEvery: 15, searchRetryTicks: 90, maxSearchRetries: 6,
    search: { radius: 3.0, candidateLimit: 64, candidateMerge: 0.18, occupiedRadius: 0.3 },
    cooldownTicks: 600, advantage: 0.12, companionRadius: 0.9, companionBonus: 0.04, distanceCost: 0.05,
    speed: 0.012, surfaceLift: 0.09, pathStep: 0.07, bodyRadius: 0.1,
    // D-055: presentation only. A calm resident lurks with its crown showing and surfaces now and then to look around;
    // depths are fractions of its body radius (negative = below ground), times are seconds. Disturbance above
    // `quietLevel` stops the peeks and makes it tremble, up to `tremble.amount` of its radius at `retreatLevel`.
    look: {
      lurk: -0.72, hide: -0.8, peek: 0.3, every: [6, 12], out: 2.8, rise: 0.3, climb: 1.1,
      plants: { radius: 1.2, fullAt: 4, periodScale: 0.55, outBonus: 1.8 },
      glance: 0.9, glanceRate: 2.1,
      tremble: { amount: 0.2, roll: 0.18, rate: 11 },
    },
  },
  signal: { pulseSeconds: 3.2, planetsAfter: 3, maxPlanets: 5, planetFadeSeconds: 4 },
  // D-049: pulling the camera back to see every known world. All values are guesses until playtested.
  system: {
    pullSeconds: 1.4, diveSeconds: 1.3, arriveSeconds: 0.9, holdMs: 900,
    focusDistanceFactor: 6.5,
    distance: { min: 14, max: 48, margin: 1.1 },
    zoom: { min: 12, max: 48, step: 0.08 },
    marks: { plants: 60, antennas: 8, residents: 16, robots: 12 },
    ghostOpacity: 0.17, arcOpacity: 0.55, arcLift: 2.2,
    fade: { otherWorlds: [0.25, 0.85], atmosphere: [0, 0.45], marks: [0.35, 0.9] },
  },
  // D-043: Autopilot hands the whole planet to the crew. Each robot sweeps `sectors` work areas of `radius` in turn;
  // after a lap with no work it rests `restTicks`, doubling each fruitless lap up to `maxRestFactor` times. Builders
  // instead share one queue of sectors, leave each after `builderJobsPerSector` jobs and retire when the queue is empty. Gardeners and Builders wait while funds sit below `holdBelow`
  // and resume above `resumeAbove`. Signals go out every `broadcastEvery` ticks while antennas stand.
  autopilot: {
    maxPerKind: 4, defaults: { miner: 2, gardener: 1, rigger: 1, builder: 1 },
    miner: { sectors: 6, radius: 2.4 }, gardener: { sectors: 6, radius: 2.4 }, rigger: { sectors: 6, radius: 2.4 }, builder: { sectors: 12, radius: 1.4 },
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
