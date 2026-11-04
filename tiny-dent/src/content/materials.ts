// D-066: physical construction materials. A planet's excavation yields exactly one of them (SurfaceProfile.material).
// Saleable ore is not here: minerals found in resource clusters stay in economy.mineralStock.

export type MaterialId = 'soil' | 'scrap' | 'plastic' | 'fiber' | 'gel' | 'ice'

export interface MaterialProfile {
  name: string
  /** What one unit of stock looks like in the site panel. */
  color: string
}

export const materials = {
  soil: { name: 'Soil', color: '#9d8567' },
  scrap: { name: 'Scrap metal', color: '#8d949b' },
  plastic: { name: 'Plastic chips', color: '#d98a6a' },
  fiber: { name: 'Fibre', color: '#c9b79c' },
  gel: { name: 'Gel', color: '#b46f9c' },
  ice: { name: 'Ice', color: '#a9cfe0' },
} as const satisfies Record<MaterialId, MaterialProfile>

export const materialIds = Object.keys(materials) as MaterialId[]
