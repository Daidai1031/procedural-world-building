import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Not persisted: this is scratch state for the terrain mesh rebuild the panel
// is currently waiting on, read by CompositeLabPanel and written by
// CompositeLabDemo, which sit on either side of the canvas boundary. Kept out
// of useCompositeLabStore so it never rides along in that store's localStorage
// write on every progress tick.
export const useCompositeLabBuildStore = create((set) => ({
  isBuilding: false,
  progress: 100,
  setStatus: ({ isBuilding, progress }) => set({ isBuilding, progress }),
}))

// Free colour choices, not design tokens — a starting point close to the
// lesson's own palette, picked once and then fair game to change.
export const DEFAULT_TERRAIN = { shape: 'ground', resolution: 16 }

const TERRAIN_SHAPES = ['ground', 'caves', 'islands']

export const DEFAULT_LAYERS = {
  height: { lowColor: '#4f7a12', midColor: '#24d67b', highColor: '#ffe05c', midpoint: 0.52 },
  slope: { enabled: false, threshold: 0.2, width: 0.08, color: '#55555f' },
  snow: { enabled: false, line: 0.55, color: '#ffffff' },
  water: { enabled: false, threshold: 0.1, color: '#556998' },
  scan: { enabled: false, radius: 1.5, color: '#fba5d0', showMarker: true },
  fresnel: { enabled: false, power: 2.5, color: '#ffe05c' },
  // Free colours here too, on the same reasoning as height's low/mid/high —
  // MatCap's highlight/mid/shadow used to be baked into the shared canvas
  // pattern (see matcapTexture.js) as the lesson's fixed green palette, which
  // meant turning MatCap on in the lab always overwrote whatever colour
  // scheme was being tried elsewhere, no matter what the other layers were
  // set to.
  matcap: { enabled: false, strength: 0.6, angle: 45, highlightColor: '#ffffff', midColor: '#24d67b', shadowColor: '#55555f' },
  ripple: { enabled: false, amplitude: 0.25, frequency: 5, speed: 1.6 },
}

// Fills in any field a layer is missing (an older save made before that field
// existed, e.g. before scan.showMarker or matcap's colours) from
// DEFAULT_LAYERS, without touching fields the save does have. Used both when
// localStorage is rehydrated and when a preset is loaded, so a preset saved
// on an older build of the lab never leaves a field silently undefined.
function mergeLayers(saved) {
  if (!saved) return DEFAULT_LAYERS
  return Object.fromEntries(
    Object.keys(DEFAULT_LAYERS).map((name) => [name, { ...DEFAULT_LAYERS[name], ...(saved[name] ?? {}) }]),
  )
}

// Bump the key on any schema change rather than migrating corrupted old data.
export const useCompositeLabStore = create(
  persist(
    (set, get) => ({
      terrain: DEFAULT_TERRAIN,
      layers: DEFAULT_LAYERS,
      presets: [],

      setTerrain: (patch) => set((state) => ({ terrain: { ...state.terrain, ...patch } })),
      setLayer: (name, patch) => set((state) => ({
        layers: { ...state.layers, [name]: { ...state.layers[name], ...patch } },
      })),
      resetLayers: () => set({ terrain: DEFAULT_TERRAIN, layers: DEFAULT_LAYERS }),

      // Overwrites a preset of the same name rather than accumulating
      // duplicates, since re-saving under a name you already used is the
      // obvious way to update it.
      savePreset: (name) => set((state) => {
        const entry = { name, terrain: state.terrain, layers: state.layers, savedAt: Date.now() }
        const presets = state.presets.filter((preset) => preset.name !== name)
        return { presets: [...presets, entry] }
      }),
      loadPreset: (name) => {
        const preset = get().presets.find((entry) => entry.name === name)
        if (preset) set({ terrain: preset.terrain, layers: mergeLayers(preset.layers) })
      },
      // Adds a preset from an exported .json record. Overwrites one of the same
      // name, like savePreset. Throws a readable message when the file is not a
      // preset, so the panel can show it. Returns the name it was stored under.
      importPreset: (record) => {
        const name = typeof record?.name === 'string' ? record.name.trim() : ''
        if (!name || typeof record.layers !== 'object' || record.layers === null) {
          throw new Error('This file is not an exported shader lab preset.')
        }
        const terrain = {
          shape: TERRAIN_SHAPES.includes(record.terrain?.shape) ? record.terrain.shape : DEFAULT_TERRAIN.shape,
          resolution: Number.isFinite(record.terrain?.resolution)
            ? Math.min(64, Math.max(8, Math.round(record.terrain.resolution / 8) * 8))
            : DEFAULT_TERRAIN.resolution,
        }
        const entry = { name, terrain, layers: mergeLayers(record.layers), savedAt: Date.now() }
        set((state) => ({ presets: [...state.presets.filter((preset) => preset.name !== name), entry] }))
        return name
      },
      deletePreset: (name) => set((state) => ({
        presets: state.presets.filter((preset) => preset.name !== name),
      })),

      // Cloud sync only, mirroring restoreConfig/restoreProgress's pattern
      // (see src/firebase/configSync.js): merge rather than overwrite, so a
      // patch saved by an older build — missing a layer field this build has
      // since added, e.g. scan.showMarker — fills in from the current
      // defaults instead of leaving that field undefined.
      restoreCompositeLab: (patch) => set((state) => ({
        terrain: { ...state.terrain, ...(patch.terrain ?? {}) },
        layers: mergeLayers(patch.layers),
        presets: patch.presets ?? state.presets,
      })),
    }),
    {
      name: 'worldbuilding-guidebook.compositeLab.v1',
      // The default merge only shallow-merges top-level keys, so a persisted
      // `layers` object would replace DEFAULT_LAYERS wholesale and silently
      // drop any field added to a layer since that browser last saved (this
      // bit the author twice already: scan.showMarker, then matcap's
      // colours). Merge each layer against its defaults instead.
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        layers: mergeLayers(persistedState?.layers),
      }),
    },
  ),
)
