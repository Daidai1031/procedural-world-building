import type { createRunStore, TerrainMode } from '../state/runState'
import { terrainModes } from '../config/controls'
import { tuning } from '../config/tuning'
import { resourceColors } from '../config/resourceColors'
import { selectFlattenOrientation, selectTerrainMode } from '../tools/terrainTool'
import type { FlattenOrientation } from '../world/flattenPlane'

const modeLabels: Record<TerrainMode, { name: string; glyph: string; hint: string }> = {
  dig: { name: 'Dig', glyph: '▾', hint: 'remove rock' },
  add: { name: 'Add', glyph: '▴', hint: 'build it back' },
  flatten: { name: 'Flatten', glyph: '▬', hint: 'make a terrace' },
}

// Manual mode: the player's own tools. The robot keeps its settings while you are here.
export function ManualPanel({ useRunStore, tool, terrainMode, flattenOrientation, brush, onBrush, onTool, detectorCount }: {
  useRunStore: ReturnType<typeof createRunStore>
  tool: 'terrain' | 'detector'
  terrainMode: TerrainMode
  flattenOrientation: FlattenOrientation
  brush: number
  onBrush: (value: number) => void
  onTool: (tool: 'terrain' | 'detector') => void
  detectorCount: number | null
}) {
  return <>
    <p className="kicker">Manual · your hands</p>
    <div className="seg" role="group" aria-label="Manual tool">
      <button type="button" aria-pressed={tool === 'terrain'} onClick={(event) => { onTool('terrain'); event.currentTarget.blur() }}>Terrain</button>
      <button type="button" aria-pressed={tool === 'detector'} onClick={(event) => { onTool('detector'); event.currentTarget.blur() }}>Detector</button>
    </div>
    {tool === 'detector' ? <>
      <p className="hint">Click the planet to reveal wireframe and buried signals within a small area.</p>
      <ul className="legend">
        <li style={{ color: resourceColors.mineral }}>◇ Mineral</li>
        <li style={{ color: resourceColors.life }}>○ Life</li>
        <li style={{ color: resourceColors.memory }}>□ Memory</li>
      </ul>
      <dl className="facts"><dt>Signals in scan</dt><dd>{detectorCount ?? '—'}</dd></dl>
    </> : <>
      <div className="tool-cards" role="group" aria-label="Terrain mode">
        {terrainModes.map((mode) => (
          <button key={mode} type="button" aria-pressed={terrainMode === mode}
            onClick={(event) => { selectTerrainMode(useRunStore, mode); event.currentTarget.blur() }}>
            <span aria-hidden="true">{modeLabels[mode].glyph}</span>
            <strong>{modeLabels[mode].name}</strong>
            <small>{modeLabels[mode].hint}</small>
          </button>
        ))}
      </div>
      {terrainMode === 'flatten' && <div className="seg seg-small" role="group" aria-label="Flatten orientation">
        <button type="button" aria-pressed={flattenOrientation === 'radial'}
          onClick={(event) => { selectFlattenOrientation(useRunStore, 'radial'); event.currentTarget.blur() }}>Planet surface</button>
        <button type="button" aria-pressed={flattenOrientation === 'horizontal'}
          onClick={(event) => { selectFlattenOrientation(useRunStore, 'horizontal'); event.currentTarget.blur() }}>Horizontal</button>
      </div>}
      <label className="slider">Brush <output>{brush.toFixed(2)}</output>
        <input type="range" min={tuning.brush.radius.min} max={tuning.brush.radius.max} step="0.04"
          value={brush} onChange={(event) => onBrush(Number(event.currentTarget.value))} />
      </label>
    </>}
  </>
}
