// D-060: a planet's material. One seeded draw changes digging, the crew, residents and the look of the terrain.
// Every multiplier is relative to rock, which leaves the shared rules exactly as they are.

import type { AutoRobot } from '../state/runState'
import type { ResidentKind } from './residents'
import type { MaterialId } from './materials'

export type SurfaceKind = 'rock' | 'metal' | 'plastic' | 'fur' | 'jelly' | 'ice'
export type ShearPattern = 'stripes' | 'rings' | 'spiral'

export interface SurfaceProfile {
  name: string
  /** One click removes 1/hardness of the volume at hardness times the rate; the Miner digs 1/hardness as fast. */
  hardness: number
  /** Above 0 the ground returns to its original shape; the value is the share of the difference closed per `surface.settle.timeConstant`. */
  elasticity: number
  /** Above 0 digging chips off a seeded chunk and spreads cracks; the value scales the chip. */
  brittleness: number
  /** Multiplies every disturbance added to the habitat. */
  noise: number
  /** Multiplies exposure per broadcast and how many signals one broadcast counts as. */
  conductivity: number
  /** D-066: the construction material that excavating here yields, one unit per removed sample. */
  material: MaterialId
  /** Multiplies the sale price of minerals mined here. */
  price: number
  /** Power and work-time multipliers per robot. Missing entries are 1. */
  crew: { power?: Partial<Record<AutoRobot, number>>; work?: Partial<Record<AutoRobot, number>> }
  /** Multiplies residents that start on the surface. */
  population: number
  /** False: the Gardener cannot plant here. */
  plantable: boolean
  /** Added to a species' score when a planet chooses its native. */
  natives: Partial<Record<ResidentKind, number>>
  /** The company's line about this world, and the small print under it. */
  company: { line: string; fine?: string }
  /** The three.js material behind the terrain, with its fixed settings. */
  look: {
    roughness: number
    metalness: number
    clearcoat?: number
    clearcoatRoughness?: number
    sheen?: number
    sheenRoughness?: number
    transmission?: number
    thickness?: number
    ior?: number
    attenuationDistance?: number
    /** Key into palette.surface for the color light picks up inside the material. */
    attenuation?: 'jelly' | 'ice'
    /** Strength of reflections from the shared environment map. */
    envMapIntensity?: number
  }
}

export const surfaces = {
  rock: {
    name: 'Rock', hardness: 1, elasticity: 0, brittleness: 0, noise: 1, conductivity: 1, material: 'soil',
    price: 1,
    crew: {}, population: 1, plantable: true, natives: {},
    company: { line: 'Empty. Awaiting development.' },
    look: { roughness: 0.95, metalness: 0 },
  },
  metal: {
    name: 'Metal', hardness: 2, elasticity: 0, brittleness: 0, noise: 2, conductivity: 2, material: 'scrap',
    price: 1.5,
    crew: { power: { miner: 2 } }, population: 1, plantable: true, natives: { sentinel: 2 },
    company: { line: 'Premium alloy world. Ideal for luxury estates.' },
    look: { roughness: 0.3, metalness: 0.9, envMapIntensity: 1 },
  },
  plastic: {
    name: 'Plastic', hardness: 0.6, elasticity: 0, brittleness: 0, noise: 1, conductivity: 1, material: 'plastic',
    price: 0.6,
    crew: { work: { builder: 0.5 } }, population: 0.6, plantable: false, natives: { cairn: 2 },
    company: { line: 'Planet™. 100% recyclable*', fine: '*not really' },
    look: { roughness: 0.4, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.6 },
  },
  fur: {
    name: 'Fur', hardness: 0.7, elasticity: 0, brittleness: 0, noise: 0.5, conductivity: 1, material: 'fiber',
    price: 1,
    crew: { work: { gardener: 0.3 } }, population: 1.2, plantable: false, natives: { moss: 4 },
    company: { line: 'Wool futures: shear the planet every quarter.' },
    look: { roughness: 0.85, metalness: 0, sheen: 1, sheenRoughness: 0.8 },
  },
  jelly: {
    name: 'Jelly', hardness: 0.8, elasticity: 1, brittleness: 0, noise: 1, conductivity: 1, material: 'gel',
    price: 0.8,
    crew: { power: { miner: 1.5 } }, population: 1, plantable: true, natives: { periscope: 2 },
    company: { line: 'Snack-grade planet. Theme-park conversion advised.' },
    look: { roughness: 0.16, metalness: 0, transmission: 0.95, thickness: 0.7, ior: 1.35, attenuationDistance: 3.2, attenuation: 'jelly', envMapIntensity: 0.5 },
  },
  ice: {
    name: 'Ice', hardness: 1.2, elasticity: 0, brittleness: 1, noise: 1, conductivity: 1, material: 'ice',
    price: 1.3,
    crew: {}, population: 1, plantable: true, natives: { crystal: 4 },
    company: { line: 'Natural premium drinking water resource.' },
    look: { roughness: 0.14, metalness: 0, transmission: 0.8, thickness: 1.1, ior: 1.31, attenuationDistance: 1.4, attenuation: 'ice', envMapIntensity: 0.55 },
  },
} as const satisfies Record<SurfaceKind, SurfaceProfile>

// Hardness shrinks the brush so one click removes 1/hardness of the volume.
export const brushScale = (surface: SurfaceProfile) => Math.cbrt(1 / surface.hardness)

export const surfaceKinds = Object.keys(surfaces) as SurfaceKind[]

/** D-069: the surface a material stands for, the one whose excavation yields it (plastic chips make plastic ground). */
export function surfaceOfMaterial(material: MaterialId): SurfaceKind {
  for (const kind of surfaceKinds) if (surfaces[kind].material === material) return kind
  return 'rock'
}
export const shearPatterns: readonly ShearPattern[] = ['stripes', 'rings', 'spiral']
