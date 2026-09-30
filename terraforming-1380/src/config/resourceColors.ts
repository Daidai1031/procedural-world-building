import type { ResourceCategory } from '../world/resourceClusters'

// One accent per resource category, shared by the terrain glow, buried markers, and the legend.
export const resourceColors: Record<ResourceCategory, string> = {
  mineral: '#cfa726',
  life: '#3f9a58',
  memory: '#c52b7d',
}
