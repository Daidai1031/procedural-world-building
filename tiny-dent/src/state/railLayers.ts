import { create } from 'zustand'

// LOG-09: the two debug layers of the interplanetary graph. Both start on; they only change what is drawn.
export const useRailLayers = create<{ routes: boolean; flow: boolean }>()(() => ({ routes: true, flow: true }))
export const toggleRailLayer = (layer: 'routes' | 'flow') => useRailLayers.setState(state => ({ [layer]: !state[layer] }))
