import type { ResourceCategory } from '../world/resourceClusters'

// One accent per resource category, shared by the terrain glow, buried markers, and the legend.
export const resourceColors: Record<ResourceCategory, string> = {
  mineral: '#cfa726',
}
