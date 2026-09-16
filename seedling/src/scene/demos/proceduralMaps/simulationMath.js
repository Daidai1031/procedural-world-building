import { sampleProceduralMap } from './noiseMath.js'

// #region four-neighbors
const DIRECTIONS_4 = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]
// #endregion

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export const DEFAULT_SIMULATION_SETTINGS = {
  resolution: 48,
  worldSize: 10,
  stepsPerSecond: 10,
  rainfall: 0.006,
  flowRate: 0.45,
  erosionStrength: 0.32,
  depositionRate: 0.18,
  evaporation: 0.12,
  sedimentCapacity: 8,
}

/**
 * The simulation state is three equally sized grids. Height begins as the
 * Assignment 1 noise stack; water and sediment begin empty.
 */
export function createErosionState(mapSettings, simulationSettings) {
  const size = simulationSettings.resolution
  const cellCount = size * size
  const height = new Float32Array(cellCount)
  const halfWorld = simulationSettings.worldSize / 2

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const x = (column / (size - 1)) * simulationSettings.worldSize - halfWorld
      const z = (row / (size - 1)) * simulationSettings.worldSize - halfWorld
      height[row * size + column] = sampleProceduralMap(x, z, mapSettings)
    }
  }

  return {
    size,
    iteration: 0,
    height,
    water: new Float32Array(cellCount),
    sediment: new Float32Array(cellCount),
  }
}

/**
 * One timestep reads only the previous state and writes into fresh grids.
 * This two-buffer pattern prevents cells later in the loop from seeing a
 * mixture of old and new values.
 */
export function stepHydraulicErosion(state, settings) {
  const { size } = state
  const cellCount = size * size
  const nextHeight = new Float32Array(state.height)
  const nextWater = new Float32Array(cellCount)
  const nextSediment = new Float32Array(cellCount)
  const terrainDelta = new Float32Array(cellCount)

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column
      // #region rainfall
      const water = state.water[index] + settings.rainfall
      const surface = state.height[index] + water
      // #endregion
      // #region downhill-flow
      let lowestIndex = -1
      let largestDrop = 0

      for (const [offsetX, offsetY] of DIRECTIONS_4) {
        const neighborX = column + offsetX
        const neighborY = row + offsetY
        if (neighborX < 0 || neighborX >= size || neighborY < 0 || neighborY >= size) continue

        const neighborIndex = neighborY * size + neighborX
        const neighborSurface = state.height[neighborIndex] + state.water[neighborIndex]
        const drop = surface - neighborSurface
        if (drop > largestDrop) {
          largestDrop = drop
          lowestIndex = neighborIndex
        }
      }

      let carriedSediment = state.sediment[index]
      let flowingWater = 0
      // #endregion

      // #region erosion-deposition
      if (lowestIndex >= 0 && largestDrop > 0) {
        flowingWater = Math.min(water, largestDrop * settings.flowRate)
        const capacity = Math.max(0.00002, flowingWater * largestDrop * settings.sedimentCapacity)

        if (carriedSediment < capacity) {
          const eroded = Math.min(
            (capacity - carriedSediment) * settings.erosionStrength,
            Math.max(0, state.height[index] - 0.02),
          )
          terrainDelta[index] -= eroded
          carriedSediment += eroded
        } else {
          const deposited = (carriedSediment - capacity) * settings.depositionRate
          terrainDelta[index] += deposited
          carriedSediment -= deposited
        }
      } else {
        const deposited = carriedSediment * settings.depositionRate
        terrainDelta[index] += deposited
        carriedSediment -= deposited
      }
      // #endregion

      const movedFraction = water > 0 ? flowingWater / water : 0
      nextWater[index] += water - flowingWater
      nextSediment[index] += carriedSediment * (1 - movedFraction)

      if (lowestIndex >= 0) {
        nextWater[lowestIndex] += flowingWater
        nextSediment[lowestIndex] += carriedSediment * movedFraction
      }
    }
  }

  // #region evaporation
  for (let index = 0; index < cellCount; index += 1) {
    nextWater[index] *= 1 - settings.evaporation

    if (nextWater[index] < 0.0005 && nextSediment[index] > 0) {
      const dryDeposit = nextSediment[index] * 0.25
      terrainDelta[index] += dryDeposit
      nextSediment[index] -= dryDeposit
    }

    nextHeight[index] = clamp(state.height[index] + terrainDelta[index], 0.02, 1.2)
  }
  // #endregion

  return {
    size,
    iteration: state.iteration + 1,
    height: nextHeight,
    water: nextWater,
    sediment: nextSediment,
  }
}

export function sampleSimulationGrid(values, size, u, v) {
  const gridX = clamp(u, 0, 1) * (size - 1)
  const gridY = clamp(v, 0, 1) * (size - 1)
  const x0 = Math.floor(gridX)
  const y0 = Math.floor(gridY)
  const x1 = Math.min(size - 1, x0 + 1)
  const y1 = Math.min(size - 1, y0 + 1)
  const tx = gridX - x0
  const ty = gridY - y0
  const bottom = values[y0 * size + x0] * (1 - tx) + values[y0 * size + x1] * tx
  const top = values[y1 * size + x0] * (1 - tx) + values[y1 * size + x1] * tx

  return bottom * (1 - ty) + top * ty
}

export function getSimulationStats(state, worldSize) {
  let minimumHeight = Infinity
  let maximumHeight = -Infinity
  let totalWater = 0

  for (let index = 0; index < state.height.length; index += 1) {
    minimumHeight = Math.min(minimumHeight, state.height[index])
    maximumHeight = Math.max(maximumHeight, state.height[index])
    totalWater += state.water[index]
  }

  return {
    minimumHeight,
    maximumHeight,
    totalWater,
    cellSize: worldSize / (state.size - 1),
    cellCount: state.size * state.size,
  }
}
