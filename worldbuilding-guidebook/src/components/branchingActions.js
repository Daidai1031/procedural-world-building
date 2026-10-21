import { useSceneStore } from '../store/sceneStore.js'
import { ASSET_PRESETS } from '../scene/demos/branching/asset.js'
import { branchingParams } from '../scene/demos/branching/params.js'
import { useWorldPlayback } from '../scene/demos/branching/worldPlayback.js'

// Choosing a design writes every value it fixes; the learner adjusts from there.
export function applyDesign(name) {
  const { setParam } = useSceneStore.getState()
  setParam('branchingPreset', name)
  for (const [key, value] of Object.entries(ASSET_PRESETS[name].values)) setParam(key, value)
}

export function worldActions() {
  const defaultsFor = (name) => branchingParams[name].default
  return {
    syncReset: () => {
      const { params } = useSceneStore.getState()
      useWorldPlayback.getState().restart({ workB: params.branchingWorkB, shelter: params.branchingShelter, working: params.branchingRobotWorking })
    },
    restoreExample: () => {
      const { setParam } = useSceneStore.getState()
      for (const name of ['branchingWorkB', 'branchingShelter', 'branchingRobotWorking', 'branchingNoiseOverlay']) setParam(name, defaultsFor(name))
      useWorldPlayback.getState().restart({ workB: defaultsFor('branchingWorkB'), shelter: defaultsFor('branchingShelter'), working: defaultsFor('branchingRobotWorking') })
    },
  }
}
