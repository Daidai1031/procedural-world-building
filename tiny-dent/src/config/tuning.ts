// TERR-02, TERR-03, DET-01/04: mirrored in docs/tuning.md; OQ-10 remains provisional.
export const tuning = {
  // Prototype balance; credits, kW, and credits per kW-minute.
  economy: { startingCapital: 0, bankruptcyLimit: -50, mineralPrice: 40, electricityRate: 0.55, manualTerrainRate: 0.02,
    power: { miner: 6, gardener: 3, rigger: 3, builder: 8 } },
  ecology: { baseline: 60, plantValue: 0.09, terrainLoss: 60, preparedSamples: 10000 },
  // D-066: one unit of construction material per density sample a robot removes. Ore found in clusters is sold on delivery
  // while autoSellOre is true (D-039); false keeps it in economy.mineralStock.
  materials: { unitPerSample: 1, autoSellOre: true },
  // D-067: credits, whole units and logistics ticks (one per simulation tick of the planet being played). A route costs
  // `routeBase` plus `routePerUnit` per world unit between the planets and takes `ticksPerUnit` ticks per unit. `lot` is
  // the size of the shipment button.
  logistics: { spaceportCost: 40, routeBase: 30, routePerUnit: 4, ticksPerUnit: 90, capacity: 60, feePerUnit: 0.1, lot: 20 },
  // D-068: how a visitor judges a place. Comfort is a weighted sum in 0..1 (material fit, stable home, quiet, company of
  // its own species, plus a personal `bias`; the weights belong to each species, see content/species.ts); belonging integrates comfort − 0.5 by `rate` at every check. After a
  // `trialTicks` trial, belonging at or above `establishAt` settles it for good and at or below `homesickAt` makes it
  // homesick; coming back needs `recoverAt` and losing "established" needs belonging below `keepAbove` (the gap is the
  // hysteresis). A change of life waits `cooldownTicks`. A homesick visitor boards a free return train after
  // `returnAfterTicks`, if a route reaches home. A colony is `colonyMin` or more of one species with homes within `colonyRadius`.
  migration: {
    trialTicks: 900, rate: 0.05, bias: 0.05, startBelonging: 0.5,
    foreignFit: 0.2, companyRadius: 1.2, companyFull: 2,
    establishAt: 0.85, keepAbove: 0.5, homesickAt: 0.15, recoverAt: 0.4,
    cooldownTicks: 300, returnAfterTicks: 1800, homelessGrace: 300, seatFee: 2, fitPull: 1, colonyRadius: 1.2, colonyMin: 2,
  },
  // D-069: a patch of shipped material. `cost` units are spent when the Builder has verified the patch; `radius` is
  // world units; `max` per planet; `tolerance` is how far the ground may move before the patch is gone.
  patches: { cost: 24, radius: 0.55, max: 12, tolerance: 0.12 },
  // D-070: walkers on a sampled ground graph. A node every `spacing` world units (at most `maxNodes`), each joined to its
  // `neighbours` nearest; an edge steeper than `maxSlope` (rise over run) is a cliff and blocks. An edge costs its length
  // times (1 + `slopeCost` × slope + `hazardCost` × disturbance). A new errand starts every `spawnEvery` ticks, at most
  // `maxTrips` at once; a walker covers `walkSpeed` cost per tick. Each crossing adds 1 heat (up to `heatCap`); every
  // `decayEvery` ticks heat is multiplied by `decay` and dropped below `heatFloor`. At `pathAt` heat an edge shows as a
  // desire path; at `roadAt` it wears into a road with no Builder or material. A resident on the ground leaves heat as it
  // walks too. A resident only follows a road if it lies within `roadReach` of both ends of its walk and the way along it is
  // at most `roadDetour` times the straight one. A search expands at most `expand` nodes.
  traffic: {
    spacing: 0.32, maxNodes: 900, neighbours: 6, maxSlope: 1.1, slopeCost: 1.5, hazardCost: 2,
    spawnEvery: 90, maxTrips: 6, walkSpeed: 0.02, decayEvery: 30, decay: 0.9942, heatFloor: 0.05, heatCap: 60,
    pathAt: 3, roadAt: 8, expand: 2500, rerouteLog: 6, roadReach: 0.7, roadDetour: 1.8,
  },
  // D-075: a worn road multiplies the cost of its edge by `factor` for the planet's material (ice melts and jelly shifts,
  // so they help less).
  roads: { factor: { rock: 0.5, metal: 0.45, plastic: 0.5, fur: 0.6, jelly: 0.7, ice: 0.65 } },
  // D-073: a sphere-shaped signal planet is an ocean when its own draw falls below `chance`. Its core is then at most `maxRadius`
  // (a fraction of the voxel world) so the water fits, and the water covers the highest seabed by `margin` world units.
  // A swimmer needs `minDepth` of water; unanchored mounds wash away after `erodeAfter` ticks (checked every `erodeEvery`);
  // a platform costs `platformCost` structural material and `platformSoil` soil.
  water: {
    chance: 0.4, maxRadius: 0.3, margin: 0.45, minDepth: 0.35, bestDepth: [0.5, 1.4], surfaceGap: 0.12, seabedGap: 0.1,
    swimSpeed: 0.012, drift: 0.35, erodeAfter: 2400, erodeEvery: 60, platformCost: 30, platformSoil: 12, dry: 0.02,
  },
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
    home: { radius: 0.34, relief: 0.16, minerals: 1, residents: 1, shape: 'sphere', surface: 'rock', water: 0 },
    // D-056/D-058: a wide size range, and relief down to exactly smooth. Only spheres carry relief; the other solids are bare geometry.
    radius: [0.17, 0.38], relief: [0, 0.2], minerals: [0.4, 2], residents: [0.3, 2],
    smoothBelow: 0.04,
    // Share of signal planets per solid, in order of `shapes`.
    shapes: ['sphere', 'cube', 'tetra', 'donut', 'apple', 'nail'], shapeWeights: [0.25, 0.15, 0.15, 0.15, 0.15, 0.15],
    // D-060: share of signal planets per material, in order of `surfaces`. Rock stays rare so a new planet usually feels new.
    surfaces: ['rock', 'metal', 'plastic', 'fur', 'jelly', 'ice'], surfaceWeights: [0.1, 0.18, 0.18, 0.18, 0.18, 0.18],
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
  // D-060/D-061: planet surfaces. Rule multipliers per material are in content/surfaces.ts; these are the shared thresholds.
  surface: {
    // An edit this deep (world units) counts as a full scar.
    scarDepth: 0.16,
    // Elastic ground: a chunk starts closing after `restSeconds` without edits, and moves toward its original density
    // with this time constant, in steps of `stepSeconds`. Differences under `snap` finish at once.
    settle: { restSeconds: 3, timeConstant: 14, stepSeconds: 0.25, snap: 0.01 },
    // Fur: bald and combed ground regrows fully in `seconds`, in steps of `stepSeconds`.
    regrow: { seconds: 120, stepSeconds: 2 },
    // A resident on ground balder than this has lost its cover.
    exposedAbove: 0.5,
    // Hair shells: how many, how long (world units), strands per world unit, sway and droop as shares of the length.
    // When frames average over `slowFrame` seconds across `window` seconds, the shell count halves, down to none (SUR-14).
    fur: { shells: 16, length: 0.13, density: 46, wind: 0.14, droop: 0.28, maxLevel: 1, slowFrame: 0.034, window: 2, minShells: 4 },
    // Jelly: how far a disturbance source reaches and the ripple it sends out. `height` is world units per disturbance level.
    ripple: { reach: 1.5, frequency: 11, speed: 8, height: 0.022 },
    // Gardener on fur: radius of one cut, spacing along a line and between lines (world units), and the scar a cut leaves.
    shear: { radius: 0.13, along: 0.15, gap: 0.42, scar: 0.55 },
    // Ice: one chip per `everySamples` rock removed, as a polyhedron of `faces` planes, `size` brush radii across,
    // centered `offset` brush radii from the cut. Cracks reach `crackReach` brush radii.
    chip: { everySamples: 40, faces: 7, size: 0.75, offset: 0.9, crackReach: 2.2 },
    // A chip within `reach` of a burrow's tunnel blocks it with this chance, with a plug `plug` tunnel radii across.
    crack: { reach: 0.7, chance: 0.35, plug: 1.5 },
    // A robot over one spot for `afterTicks` melts a pit of `radius` under it every `everyTicks`.
    melt: { stillWithin: 0.05, afterTicks: 240, everyTicks: 45, radius: 0.16 },
    // Digging sound. Edits are spaced by at least `gapLoud` seconds, or `gapQuiet` below level `loudAbove`; `fullAt` rock
    // samples in one edit is full volume, and a robot's small steps never fall below `floor`.
    sound: { volume: 0.5, gapLoud: 0.05, gapQuiet: 0.42, loudAbove: 0.6, fullAt: 60, floor: 0.25 },
    // Transmissive planets render the extra pass at this share of the canvas (SUR-14).
    transmissionScale: 0.6,
    // Plastic: colored points added per excavated sample, up to `points`. They never leave (D-060).
    micro: { points: 2600, perSample: 0.5, size: 3 },
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
  // AUT-14–16, D-057, D-063: the Gardener sows the flattest ground; plants grow and fill it in. The Rigger (below) raises antennas.
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
    // D-055/D-059: presentation only. A calm resident lurks with `crown` of its height above ground (`hideCrown` while
    // hiding), but always deep enough to keep its eye rims at least `eyeCover` under ground, and surfaces now and then until
    // its eyes clear the ground by `eyeClear`. Models are built in model units and drawn at `modelScale` world units
    // per model unit, times the resident's size. Times are seconds.
    // Disturbance above `quietLevel` stops the peeks and makes it tremble, up to `tremble.amount` of `bodyRadius`.
    look: {
      modelScale: 0.2, crown: 0.3, hideCrown: 0.2, eyeClear: 0.14, eyeCover: 0.05,
      every: [6, 12], out: 2.8, rise: 0.3, climb: 1.1,
      plants: { radius: 1.2, fullAt: 4, periodScale: 0.55, outBonus: 1.8 },
      glance: 0.9, glanceRate: 2.1,
      tremble: { amount: 0.2, roll: 0.18, rate: 11 },
    },
    // D-059: a signal planet's species is the one whose authored native planet best matches it; this much seeded
    // randomness (in steps of the 1–3 profile scales) is added to each species' score so near ties vary. Solids other
    // than spheres have no noise relief; their edges count as this relief level instead (absent: flat).
    speciesJitter: 1.5, solidRelief: { cube: 2, tetra: 3, nail: 3 },
    // D-059: each species bends the shared rules. Simulation fields multiply the shared value: `speed`, `wander` (the
    // stroll interval: lower is more restless), `retreat` (noise needed to hide: higher is braver), `quiet` (calm needed
    // to come back out), `flee` (noise endured before moving away), `social` (companionBonus; negative seeks solitude),
    // `burrow` (burrowBonus) and `population` (surface residents at the start). `look` fields replace the shared ones,
    // except `tremble`, `gait`, `plants` and `scale`, which multiply. `glanceStyle`: snap holds each side, sweep pans
    // slowly, dart jumps between random directions.
    temperament: {
      facet: {},
      // D-073: a swimmer drifts in water; the shared fright rules apply, only its look differs.
      glassfin: { speed: 1, wander: 1, retreat: 1, quiet: 1, flee: 1, social: 1, look: { scale: 1.2, gait: 1 } },
      moss: { speed: 0.7, wander: 2.5, retreat: 1.3, quiet: 1.4, flee: 1.6, social: 1.3,
        look: { every: [10, 18], out: 5, glance: 0.4, glanceRate: 0.7, glanceStyle: 'sweep', tremble: 0.6, gait: 0.7, plants: 2 } },
      slab: { speed: 0.8, wander: 3, retreat: 1.6, quiet: 2, flee: 1.8, social: 1.5, population: 0.8,
        look: { every: [12, 20], out: 4.5, glance: 0.5, glanceRate: 0.5, glanceStyle: 'sweep', tremble: 0.5, gait: 0.75, crown: 0.4 } },
      crystal: { speed: 1.1, wander: 2, retreat: 0.65, quiet: 1.8, flee: 0.7,
        look: { every: [9, 16], out: 1.8, glance: 0.7, glanceRate: 3, glanceStyle: 'dart', tremble: 1.4 } },
      sentinel: { speed: 0.9, wander: 1.5, retreat: 1.4, quiet: 0.6, flee: 1.3, social: 0.6, population: 0.7,
        look: { every: [4, 7], out: 4.5, glance: 1.2, glanceRate: 0.9, glanceStyle: 'sweep', tremble: 0.7 } },
      hermit: { speed: 0.6, wander: 4, retreat: 0.7, quiet: 2.2, flee: 1.2, social: -1.5, burrow: 1.6, population: 0.6,
        look: { every: [14, 24], out: 2, glance: 0.6, glanceRate: 2.6, glanceStyle: 'dart', crown: 0.45 } },
      cairn: { speed: 0.85, wander: 0.8, retreat: 0.9, social: 3, population: 1.4,
        look: { every: [5, 10], out: 3, glance: 0.8, glanceRate: 1.6, tremble: 1.2, gait: 0.8 } },
      periscope: { speed: 0.75, wander: 2, quiet: 0.8, flee: 1.2, burrow: 1.4,
        look: { every: [3, 6], out: 3.5, glance: 1, glanceRate: 1.4, glanceStyle: 'sweep', crown: 0.5 } },
      shard: { speed: 1.5, wander: 0.35, retreat: 0.8, quiet: 0.6, flee: 0.6, social: 0.5,
        look: { every: [4, 8], out: 1.5, glance: 1, glanceRate: 3.6, glanceStyle: 'dart', tremble: 1.3, gait: 1.4 } },
    },
  },
  signal: { pulseSeconds: 3.2, planetsAfter: 3, maxPlanets: 5, planetFadeSeconds: 4 },
  // D-049: pulling the camera back to see every known world. All values are guesses until playtested.
  system: {
    pullSeconds: 1.4, diveSeconds: 1.3, arriveSeconds: 0.9, holdMs: 900,
    focusDistanceFactor: 6.5,
    distance: { min: 14, max: 64, margin: 1.1 },
    zoom: { min: 12, max: 64, step: 0.08 },
    marks: { plants: 60, antennas: 8, residents: 16, robots: 12 },
    ghostOpacity: 0.17, arcOpacity: 0.55, arcLift: 2.2,
    fade: { otherWorlds: [0.25, 0.85], atmosphere: [0, 0.45], marks: [0.35, 0.9] },
    // SYS-01: seeded ring layout, then a soft separation so later signal worlds keep surface clearance.
    layout: {
      baseSpacing: 7.4, perIndex: 0.55, radiusJitter: 1.8, angleJitter: 0.55, lift: 3.2,
      outwardSpread: 1.15, minGap: 1.35, separatePasses: 14,
    },
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
  // D-063: `sowSpacing` is how far apart a Gardener sets plants; `plantSpacing` is how close a plant's own seeds may land.
  structures: {
    plantSpacing: 0.2, sowSpacing: 0.6, antennaSpacing: 0.9, mixedClearance: 0.3, anchorLift: 0.14,
    maxPlants: 400, maxAntennas: 8,
    stages: 3, growTicks: 300, spreadTicks: 450, spreadRadius: 0.7, spreadAttempts: 6,
  },
  // D-064: the Quiet Drifter. `height` is world units from boot sole to helmet top. It stands above the residents
  // (the tallest reach about 0.31) so the person they follow reads larger than they are. The walker's eye stays at
  // `eyeHeight` (0.16); stride and gait live with the model in render/models/drifter.ts. `walkSpeed` is
  // the walk at full stride (about three steps a second); holding Shift hurries at `hurrySpeed`, the old surface
  // speed. The follow
  // camera sits `distance` behind and `rise` above the feet and aims `aim` above them. After `lookAfter` seconds
  // without input the Drifter looks around; after `sitAfter` it sits down and watches the sky.
  drifter: {
    height: 0.38, walkSpeed: 0.17, hurrySpeed: 0.32, turnRate: 9, fade: 0.32,
    camera: { distance: 0.5, rise: 0.17, aim: 0.12, clearance: 0.05, ease: 10 },
    lookAfter: 5, sitAfter: 16,
    // Landing opens on the empty first-person view. After `appearAfter` seconds the Drifter fades in over `fade`,
    // standing `lead` ahead of the viewpoint, and walks with it (a little quicker than the walk, so a turn of the
    // view does not leave him behind). Residents within `notice` come out: up to three follow in `follow` slots
    // (right, forward, in world units), the rest watch from `watchRadius`. A click picks the nearest body along the
    // ray, unless the Drifter's own chest is closer.
    visit: {
      appearAfter: 0.7, fade: 0.5, lead: 0.4, catchUp: 2.4,
      notice: 0.55, audience: 8, watchRadius: 0.28,
      follow: [[0, -0.24], [-0.11, -0.36], [0.12, -0.36]],
      pickRange: 1.4, chest: 0.19, bodyRadius: 0.11,
      pickRadius: { resident: 0.09, plant: 0.08, antenna: 0.12 },
    },
  },
  // Spec §3 initialization only; M0 implements no budget or canister rules.
  budget: { energyTotal: 1000, workCycles: 30 },
  canister: { capacity: 300 },
} as const
