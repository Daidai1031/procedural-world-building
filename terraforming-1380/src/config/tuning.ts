// TERR-02, TERR-03, DET-01/04: mirrored in docs/tuning.md; OQ-10 remains provisional.
export const tuning = {
  grid: { resolution: 64 },
  chunk: { size: 16 },
  brush: { radius: { min: 0.18, default: 0.38, max: 0.9, step: 0.08 } },
  flatten: { innerFraction: 0.75 },
  remesh: { timeBudgetMs: 6 },
  detector: { radius: 0.95, fadeWidth: 0.24 },
  // Resource glow leaking through the terrain surface, faded by world-space distance to each target.
  glow: { radius: 0.62, albedoMix: 0.75, emissive: 0.35 },
  gen: {
    cluster: { mineral: { count: 14 }, life: { count: 8 }, memory: { count: 6 } },
    surfaceTeachingTargets: 3,
  },
  // Spec §3 initialization only; M0 implements no budget or canister rules.
  budget: { energyTotal: 1000, workCycles: 30 },
  canister: { capacity: 300 },
} as const
