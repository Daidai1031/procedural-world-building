import type { MutableRefObject } from 'react'
import { resourceColors } from '../config/resourceColors'
import type { ResourceCategory } from '../world/resourceClusters'
import { resourceGlyphs } from './CollectChip'

const names: Record<ResourceCategory, string> = { mineral: 'Mineral', life: 'Life', memory: 'Memory' }

// Shared by both modes: what is left of the planet and what has been shipped to the warehouse.
export function SitePanel({ planetRemaining, stored, slotRefs, plants, antennas, soil }: {
  planetRemaining: number
  plants: number
  antennas: number
  soil: number
  stored: Record<ResourceCategory, number>
  slotRefs: MutableRefObject<Partial<Record<ResourceCategory, HTMLElement | null>>>
}) {
  return (
    <aside className="site-panel" aria-label="Site report">
      <p className="kicker">Site report</p>
      <div className="remaining-meter">
        <span>Planet remaining</span>
        <strong>{(planetRemaining * 100).toFixed(1)}<small>%</small></strong>
        <i style={{ width: `${Math.max(0, Math.min(1, planetRemaining)) * 100}%` }} />
      </div>
      <ul className="warehouse" aria-label="Warehouse">
        {(Object.keys(resourceColors) as ResourceCategory[]).map((category) => (
          <li key={category} className="warehouse-slot">
            <span ref={(element) => { slotRefs.current[category] = element }} className="slot-glyph"
              style={{ color: resourceColors[category] }}>{resourceGlyphs[category]}</span>
            <span className="slot-name">{names[category]}</span>
            <strong key={stored[category]} className="slot-count">{stored[category]}</strong>
          </li>
        ))}
      </ul>
      <ul className="on-site" aria-label="On site">
        <li><span>Plants</span><strong>{plants}</strong></li>
        <li><span>Antennas</span><strong>{antennas}</strong></li>
        <li><span>Soil in stock</span><strong>{soil}</strong></li>
      </ul>
    </aside>
  )
}
