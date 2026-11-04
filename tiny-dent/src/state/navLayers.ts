import { create } from 'zustand'

// RDS-09: the debug layers of the ground graph and the one edge a card is open for. Drawing only; no rule reads this.
export interface NavLayers { nodes: boolean; heat: boolean; paths: boolean; roads: boolean; blocked: boolean; selected: string | null }
export const useNavLayers = create<NavLayers>()(() => ({ nodes: false, heat: false, paths: true, roads: true, blocked: true, selected: null }))
export const toggleNavLayer = (layer: Exclude<keyof NavLayers, 'selected'>) => useNavLayers.setState(state => ({ [layer]: !state[layer] }))
export const selectEdge = (id: string | null) => useNavLayers.setState({ selected: id })
