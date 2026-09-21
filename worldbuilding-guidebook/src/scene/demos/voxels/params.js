import { DEFAULT_VOXEL_SETTINGS } from './voxelMath.js'

export const voxelParams = {
  voxelShape: {
    type: 'select', label: 'Density shape', default: DEFAULT_VOXEL_SETTINGS.shape,
    options: [
      { value: 'ground', label: 'Ground' },
      { value: 'caves', label: 'Caves' },
      { value: 'islands', label: 'Floating islands' },
    ],
  },
  voxelResolution: {
    type: 'float', label: 'Voxel resolution', min: 8, max: 64, step: 8, default: DEFAULT_VOXEL_SETTINGS.resolution,
  },
}

// Which view of the Step 01 diagram is showing. The step's compare toggle flips
// it, so it never needs a control of its own in the strip.
export const volumeDiagramParams = {
  voxelDiagramMode: {
    type: 'select', label: 'View', default: 'heightField', hideFromStrip: true,
    options: [
      { value: 'heightField', label: 'Height field' },
      { value: 'volume', label: 'Voxel volume' },
    ],
  },
}

export const csgParams = {
  voxelCsgOperation: {
    type: 'select', label: 'CSG operation', default: 'union',
    options: [
      { value: 'union', label: 'Union' },
      { value: 'subtract', label: 'Subtraction' },
      { value: 'intersect', label: 'Intersection' },
    ],
  },
}

// Which order Step 05 builds in. The step's compare toggle flips it, so it never
// needs a control of its own in the strip.
export const csgOrderParams = {
  voxelCsgOrder: {
    type: 'select', label: 'Order', default: 'room-first', hideFromStrip: true,
    options: [
      { value: 'room-first', label: 'Carve the room, then add the rock' },
      { value: 'rock-first', label: 'Add the rock, then carve the room' },
    ],
  },
}

// The corner patterns Step 06 shows. The number in each label is that pattern's
// case index, which the scene cannot print itself.
export const cellParams = {
  voxelCellCase: {
    type: 'select', label: 'Corner pattern', default: 'single',
    options: [
      { value: 'empty', label: 'No corners inside (0)' },
      { value: 'single', label: 'One corner inside (1)' },
      { value: 'edge', label: 'Two corners on an edge (3)' },
      { value: 'three', label: 'Three corners in an L (7)' },
      { value: 'face', label: 'Four corners on a face (15)' },
      { value: 'opposite', label: 'Opposite corners (129)' },
    ],
  },
  // Whether the surface is drawn. The step's compare toggle flips it, so it never
  // needs a control of its own in the strip.
  voxelCellView: {
    type: 'select', label: 'View', default: 'points', hideFromStrip: true,
    options: [
      { value: 'points', label: 'Surface points' },
      { value: 'surface', label: 'Surface' },
    ],
  },
}

// Steps 07, 08 and 11 reuse the shape and resolution controls, and add which way the
// volume is drawn. The step's compare toggle flips that, so it never needs a
// control of its own in the strip.
export const meshParams = {
  voxelShape: voxelParams.voxelShape,
  voxelResolution: voxelParams.voxelResolution,
  voxelMeshMode: {
    type: 'select', label: 'Drawn as', default: 'cubes', hideFromStrip: true,
    options: [
      { value: 'cubes', label: 'Cubes' },
      { value: 'surface', label: 'Marching Cubes surface' },
      { value: 'nets', label: 'Surface Nets' },
      { value: 'culled', label: 'Culled faces' },
      { value: 'greedy', label: 'Greedy meshing' },
    ],
  },
}

// Step 09 reuses the shape and resolution controls, and adds how many chunks the
// volume is cut into. Whether the chunks keep a border is flipped by the step's
// compare toggle, so it never needs a control of its own in the strip. The
// select hands back text, so the count is read with Number.
export const chunkParams = {
  voxelShape: voxelParams.voxelShape,
  voxelResolution: voxelParams.voxelResolution,
  voxelChunksPerSide: {
    type: 'select', label: 'Chunks', default: '2',
    options: [
      { value: '1', label: '1 chunk' },
      { value: '2', label: '2 × 2 × 2 chunks' },
      { value: '4', label: '4 × 4 × 4 chunks' },
    ],
  },
  voxelChunkBorder: {
    type: 'select', label: 'Chunk border', default: 'none', hideFromStrip: true,
    options: [
      { value: 'none', label: 'No border' },
      { value: 'shared', label: 'Shared border' },
    ],
  },
}

// Step 10 digs a dent into the ground, and shows which chunks it makes the volume
// build again. Whether every chunk is built again or only the ones the dent
// reaches is flipped by the step's compare toggle, so it never needs a control
// of its own in the strip.
export const editParams = {
  voxelResolution: voxelParams.voxelResolution,
  voxelChunksPerSide: chunkParams.voxelChunksPerSide,
  voxelDentX: {
    type: 'float', label: 'Dent across', min: -2.4, max: 2.4, step: 0.1, default: -1.5,
  },
  voxelDentZ: {
    type: 'float', label: 'Dent along', min: -2.4, max: 2.4, step: 0.1, default: -1.5,
  },
  voxelEditMode: {
    type: 'select', label: 'After an edit', default: 'all', hideFromStrip: true,
    options: [
      { value: 'all', label: 'Rebuild every chunk' },
      { value: 'changed', label: 'Rebuild only what changed' },
    ],
  },
}

// Step 12 gives each column of chunks a level of detail by its distance from the
// learner's camera. Whether the seams between levels are left open or snapped
// together is flipped by the step's compare toggle, so it never needs a control of
// its own in the strip. The select hands back text, so the level count is read
// with Number.
export const lodParams = {
  voxelLodLevels: {
    type: 'select', label: 'Detail levels', default: '3',
    options: [
      { value: '1', label: '1 level (all fine)' },
      { value: '2', label: '2 levels' },
      { value: '3', label: '3 levels' },
    ],
  },
  voxelSeamMode: {
    type: 'select', label: 'Seams', default: 'snapped', hideFromStrip: true,
    options: [
      { value: 'snapped', label: 'Snapped together' },
      { value: 'gaps', label: 'Left open' },
    ],
  },
}

export function voxelSettingsFromParams(params) {
  return { shape: params.voxelShape, resolution: params.voxelResolution }
}

export function meshSettingsFromParams(params) {
  return { shape: params.voxelShape, resolution: params.voxelResolution, mode: params.voxelMeshMode }
}

export function chunkSettingsFromParams(params) {
  return {
    shape: params.voxelShape,
    resolution: params.voxelResolution,
    chunksPerSide: Number(params.voxelChunksPerSide),
    hasBorder: params.voxelChunkBorder === 'shared',
  }
}

export function editSettingsFromParams(params) {
  return {
    resolution: params.voxelResolution,
    chunksPerSide: Number(params.voxelChunksPerSide),
    dentX: params.voxelDentX,
    dentZ: params.voxelDentZ,
    reuse: params.voxelEditMode === 'changed',
  }
}

export function lodSettingsFromParams(params) {
  return {
    levelCount: Number(params.voxelLodLevels),
    hasSnapping: params.voxelSeamMode === 'snapped',
  }
}

export function csgSettingsFromParams(params) {
  return { shape: `csg-${params.voxelCsgOperation}`, resolution: params.voxelResolution }
}

export function csgOrderSettingsFromParams(params) {
  return { shape: `csg-order-${params.voxelCsgOrder}`, resolution: params.voxelResolution }
}
