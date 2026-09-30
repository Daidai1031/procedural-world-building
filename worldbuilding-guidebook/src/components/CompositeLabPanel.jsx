import { useRef, useState } from 'react'
import { useSceneStore } from '../store/sceneStore.js'
import { useCompositeLabBuildStore, useCompositeLabStore } from '../store/compositeLabStore.js'
import './CompositeLabPanel.css'

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Reads the shared canvas one animation frame from now, the same timing that
// reliably captured a fresh WebGL frame earlier in this project (see
// dev-workflow-gotchas): requestAnimationFrame runs before the browser paints,
// so the buffer three.js just drew is still there to read.
function downloadScreenshot(filename) {
  requestAnimationFrame(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = filename
    link.click()
  })
}

function safeFileStem(name) {
  return name.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'preset'
}

function ToggleRow({ title, enabled, onToggle, children }) {
  return (
    <div className="composite-lab-panel__section">
      <div className="composite-lab-panel__section-head">
        <h3 className="composite-lab-panel__section-title">{title}</h3>
        <button
          type="button"
          className="composite-lab-panel__toggle"
          aria-pressed={enabled}
          onClick={onToggle}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>
      {enabled && children}
    </div>
  )
}

function SliderRow({ label, value, min, max, step, onChange }) {
  return (
    <label className="composite-lab-panel__row">
      <span className="composite-lab-panel__row-head">
        <span className="composite-lab-panel__label">{label}</span>
        <span className="composite-lab-panel__value">{value}</span>
      </span>
      <input
        className="control__range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function SwitchRow({ label, enabled, onToggle }) {
  return (
    <div className="composite-lab-panel__row composite-lab-panel__switch-row">
      <span className="composite-lab-panel__label">{label}</span>
      <button
        type="button"
        className="composite-lab-panel__toggle"
        aria-pressed={enabled}
        onClick={onToggle}
      >
        {enabled ? 'On' : 'Off'}
      </button>
    </div>
  )
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="composite-lab-panel__row">
      <span className="composite-lab-panel__label">{label}</span>
      <div className="composite-lab-panel__color-row">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <span className="composite-lab-panel__hex">{value}</span>
      </div>
    </div>
  )
}

export default function CompositeLabPanel() {
  const demoKey = useSceneStore((state) => state.demoKey)
  const terrain = useCompositeLabStore((state) => state.terrain)
  const layers = useCompositeLabStore((state) => state.layers)
  const presets = useCompositeLabStore((state) => state.presets)
  const setTerrain = useCompositeLabStore((state) => state.setTerrain)
  const setLayer = useCompositeLabStore((state) => state.setLayer)
  const savePreset = useCompositeLabStore((state) => state.savePreset)
  const loadPreset = useCompositeLabStore((state) => state.loadPreset)
  const deletePreset = useCompositeLabStore((state) => state.deletePreset)
  const importPreset = useCompositeLabStore((state) => state.importPreset)
  const isBuilding = useCompositeLabBuildStore((state) => state.isBuilding)
  const buildProgress = useCompositeLabBuildStore((state) => state.progress)
  const [presetName, setPresetName] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const importInputRef = useRef(null)

  // Terrain rebuilds the whole mesh (marching cubes over the full volume) —
  // too heavy to run on every drag tick the way a colour or a threshold does.
  // Shape and Resolution are staged here and only committed with setTerrain
  // when the learner clicks Apply.
  const [pendingTerrain, setPendingTerrain] = useState(terrain)
  const [committedTerrain, setCommittedTerrain] = useState(terrain)
  if (terrain !== committedTerrain) {
    setCommittedTerrain(terrain)
    setPendingTerrain(terrain)
  }
  const terrainDirty = pendingTerrain.shape !== terrain.shape || pendingTerrain.resolution !== terrain.resolution

  if (demoKey !== 'composite-lab') return null

  const trimmedName = presetName.trim()
  const isUpdate = presets.some((preset) => preset.name === trimmedName)

  function handleSave() {
    const name = trimmedName
    if (!name) return
    savePreset(name)
    const stem = safeFileStem(name)
    const record = { name, terrain, layers, savedAt: new Date().toISOString() }
    downloadText(`${stem}.json`, JSON.stringify(record, null, 2), 'application/json')
    downloadScreenshot(`${stem}.png`)
    setPresetName('')
  }

  // Loading a preset fills the name field with its own name, so tweaking the
  // params and clicking Save overwrites that same preset — editing it in
  // place — instead of requiring the exact name to be retyped from memory.
  function handleLoad(name) {
    loadPreset(name)
    setPresetName(name)
  }

  // Reads one or more exported .json files. Each valid one is added to the
  // list; the last is loaded so the lab shows it straight away.
  async function handleImport(event) {
    const files = [...event.target.files]
    event.target.value = ''
    const importedNames = []
    const failures = []

    for (const file of files) {
      try {
        importedNames.push(importPreset(JSON.parse(await file.text())))
      } catch (error) {
        failures.push(error instanceof SyntaxError ? `${file.name} is not valid JSON.` : `${file.name}: ${error.message}`)
      }
    }

    if (importedNames.length > 0) handleLoad(importedNames[importedNames.length - 1])
    const summary = importedNames.length > 0 ? [`Imported ${importedNames.join(', ')}.`] : []
    setImportMessage([...summary, ...failures].join(' '))
  }

  return (
    <div className="composite-lab-panel" role="group" aria-label="Shader lab controls">
      <div className="composite-lab-panel__section">
        <div className="composite-lab-panel__section-head">
          <h3 className="composite-lab-panel__section-title">Terrain</h3>
          <button
            type="button"
            className="composite-lab-panel__apply"
            onClick={() => setTerrain(pendingTerrain)}
            disabled={!terrainDirty}
          >
            Apply
          </button>
        </div>
        <div className="composite-lab-panel__row composite-lab-panel__select">
          <span className="composite-lab-panel__label">Shape</span>
          <select
            value={pendingTerrain.shape}
            onChange={(event) => setPendingTerrain((prev) => ({ ...prev, shape: event.target.value }))}
          >
            <option value="ground">Ground</option>
            <option value="caves">Caves</option>
            <option value="islands">Floating islands</option>
          </select>
        </div>
        <SliderRow
          label="Resolution"
          value={pendingTerrain.resolution}
          min={8}
          max={64}
          step={8}
          onChange={(value) => setPendingTerrain((prev) => ({ ...prev, resolution: value }))}
        />
        {isBuilding && (
          <div
            className="composite-lab-panel__progress"
            role="progressbar"
            aria-valuenow={buildProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Rebuilding terrain mesh"
          >
            <div className="composite-lab-panel__progress-bar" style={{ width: `${buildProgress}%` }} />
            <span className="composite-lab-panel__progress-label">{buildProgress}%</span>
          </div>
        )}
      </div>

      <div className="composite-lab-panel__section">
        <div className="composite-lab-panel__section-head">
          <h3 className="composite-lab-panel__section-title">Height (base)</h3>
        </div>
        <ColorRow label="Low" value={layers.height.lowColor} onChange={(value) => setLayer('height', { lowColor: value })} />
        <ColorRow label="Mid" value={layers.height.midColor} onChange={(value) => setLayer('height', { midColor: value })} />
        <ColorRow label="High" value={layers.height.highColor} onChange={(value) => setLayer('height', { highColor: value })} />
        <SliderRow
          label="Midpoint"
          value={layers.height.midpoint}
          min={0.1}
          max={0.9}
          step={0.02}
          onChange={(value) => setLayer('height', { midpoint: value })}
        />
      </div>

      <ToggleRow title="Slope" enabled={layers.slope.enabled} onToggle={() => setLayer('slope', { enabled: !layers.slope.enabled })}>
        <SliderRow label="Threshold" value={layers.slope.threshold} min={0} max={1} step={0.02} onChange={(value) => setLayer('slope', { threshold: value })} />
        <SliderRow label="Width" value={layers.slope.width} min={0.02} max={0.3} step={0.01} onChange={(value) => setLayer('slope', { width: value })} />
        <ColorRow label="Color" value={layers.slope.color} onChange={(value) => setLayer('slope', { color: value })} />
      </ToggleRow>

      <ToggleRow title="Snow" enabled={layers.snow.enabled} onToggle={() => setLayer('snow', { enabled: !layers.snow.enabled })}>
        <SliderRow label="Line" value={layers.snow.line} min={0} max={1} step={0.02} onChange={(value) => setLayer('snow', { line: value })} />
        <ColorRow label="Color" value={layers.snow.color} onChange={(value) => setLayer('snow', { color: value })} />
      </ToggleRow>

      <ToggleRow title="Water" enabled={layers.water.enabled} onToggle={() => setLayer('water', { enabled: !layers.water.enabled })}>
        <SliderRow label="Threshold" value={layers.water.threshold} min={0} max={1} step={0.02} onChange={(value) => setLayer('water', { threshold: value })} />
        <ColorRow label="Color" value={layers.water.color} onChange={(value) => setLayer('water', { color: value })} />
      </ToggleRow>

      <ToggleRow title="Scan" enabled={layers.scan.enabled} onToggle={() => setLayer('scan', { enabled: !layers.scan.enabled })}>
        <SliderRow label="Radius" value={layers.scan.radius} min={0} max={4} step={0.1} onChange={(value) => setLayer('scan', { radius: value })} />
        <ColorRow label="Color" value={layers.scan.color} onChange={(value) => setLayer('scan', { color: value })} />
        <SwitchRow
          label="Marker dot"
          enabled={layers.scan.showMarker}
          onToggle={() => setLayer('scan', { showMarker: !layers.scan.showMarker })}
        />
      </ToggleRow>

      <ToggleRow title="Fresnel" enabled={layers.fresnel.enabled} onToggle={() => setLayer('fresnel', { enabled: !layers.fresnel.enabled })}>
        <SliderRow label="Power" value={layers.fresnel.power} min={0.5} max={8} step={0.1} onChange={(value) => setLayer('fresnel', { power: value })} />
        <ColorRow label="Color" value={layers.fresnel.color} onChange={(value) => setLayer('fresnel', { color: value })} />
      </ToggleRow>

      <ToggleRow title="MatCap" enabled={layers.matcap.enabled} onToggle={() => setLayer('matcap', { enabled: !layers.matcap.enabled })}>
        <SliderRow label="Strength" value={layers.matcap.strength} min={0} max={1} step={0.05} onChange={(value) => setLayer('matcap', { strength: value })} />
        <SliderRow label="Angle" value={layers.matcap.angle} min={0} max={360} step={5} onChange={(value) => setLayer('matcap', { angle: value })} />
        <ColorRow label="Highlight" value={layers.matcap.highlightColor} onChange={(value) => setLayer('matcap', { highlightColor: value })} />
        <ColorRow label="Mid" value={layers.matcap.midColor} onChange={(value) => setLayer('matcap', { midColor: value })} />
        <ColorRow label="Shadow" value={layers.matcap.shadowColor} onChange={(value) => setLayer('matcap', { shadowColor: value })} />
      </ToggleRow>

      <ToggleRow title="Ripple" enabled={layers.ripple.enabled} onToggle={() => setLayer('ripple', { enabled: !layers.ripple.enabled })}>
        <SliderRow label="Amplitude" value={layers.ripple.amplitude} min={0} max={1} step={0.02} onChange={(value) => setLayer('ripple', { amplitude: value })} />
        <SliderRow label="Frequency" value={layers.ripple.frequency} min={1} max={20} step={0.5} onChange={(value) => setLayer('ripple', { frequency: value })} />
        <SliderRow label="Speed" value={layers.ripple.speed} min={0} max={5} step={0.1} onChange={(value) => setLayer('ripple', { speed: value })} />
      </ToggleRow>

      <div className="composite-lab-panel__section">
        <div className="composite-lab-panel__section-head">
          <h3 className="composite-lab-panel__section-title">Presets</h3>
          <button type="button" className="composite-lab-panel__import" onClick={() => importInputRef.current.click()}>
            Import
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            hidden
            aria-label="Import presets from exported .json files"
            onChange={handleImport}
          />
        </div>
        <p className="composite-lab-panel__import-message" role="status">{importMessage}</p>
        <div className="composite-lab-panel__save">
          <input
            type="text"
            placeholder="Name"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') handleSave() }}
          />
          <button type="button" onClick={handleSave} disabled={!trimmedName}>{isUpdate ? 'Update' : 'Save'}</button>
        </div>
        {presets.length > 0 && (
          <ul className="composite-lab-panel__presets">
            {presets.map((preset) => (
              <li key={preset.name} className="composite-lab-panel__preset">
                <span className="composite-lab-panel__preset-name">{preset.name}</span>
                <button type="button" onClick={() => handleLoad(preset.name)}>Load</button>
                <button
                  type="button"
                  onClick={() => {
                    const stem = safeFileStem(preset.name)
                    downloadText(`${stem}.json`, JSON.stringify(preset, null, 2), 'application/json')
                  }}
                >
                  Export
                </button>
                <button type="button" onClick={() => deletePreset(preset.name)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
