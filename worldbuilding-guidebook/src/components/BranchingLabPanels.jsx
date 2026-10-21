import { useMemo } from 'react'
import { useSceneStore } from '../store/sceneStore.js'
import { assetConfigFromParams, GENERATOR_VERSION, generateAsset } from '../scene/demos/branching/asset.js'
import { growthProgress, GROWTH_MODES } from '../scene/demos/branching/growth.js'
import { buildLodSet, chooseLod } from '../scene/demos/branching/lod.js'
import { useBranchingPlayback } from '../scene/demos/branching/playback.js'
import {
  cellKey, statusOf, WORK_SPOTS, WORLD_A_SPOT,
} from '../scene/demos/branching/worldExperiment.js'
import { useWorldPlayback } from '../scene/demos/branching/worldPlayback.js'

const ASSET_KEYS = [
  'branchingPreset', 'branchingAssetGeneration', 'branchingAssetAngle', 'branchingAssetLengthRatio', 'branchingAssetRadiusRatio',
  'branchingSpread', 'branchingVariation', 'branchingSeed',
]

// The asset every step from 5 to 7 looks at, rebuilt only when a setting that
// shapes it changes. Looking at it (camera, look, helpers) never rebuilds it.
function useAsset() {
  const params = useSceneStore((state) => state.params)
  const key = ASSET_KEYS.map((name) => params[name]).join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => generateAsset(assetConfigFromParams(params)).segments, [key])
}

export function AssetSide() {
  const segments = useAsset()
  const params = useSceneStore((state) => state.params)
  return <div className="branching-side">
    <output className="branching-status" aria-live="polite">
      {params.branchingPreset} · {segments.length} segments · seed {params.branchingSeed} · spread {params.branchingSpread} · variation {params.branchingVariation} · generator version {GENERATOR_VERSION}
    </output>
    <output className="branching-status">The three small copies on the right use seeds 1, 2 and 3, with every other setting the same.</output>
  </div>
}

export function GrowthSide() {
  const segments = useAsset()
  const mode = useSceneStore((state) => state.params.branchingGrowthMode)
  const time = useBranchingPlayback((state) => state.growthTime)
  const playing = useBranchingPlayback((state) => state.growthPlaying)
  const { setGrowthTime, playGrowth, pauseGrowth, replayGrowth } = useBranchingPlayback.getState()
  const shown = growthProgress(segments, mode, time)
  const growing = shown.filter((piece) => piece.progress > 0 && piece.progress < 1).length
  const done = shown.filter((piece) => piece.progress >= 1).length
  return <div className="branching-side">
    <div className="branching-buttons">
      <button type="button" className="branching-primary" onClick={playing ? pauseGrowth : playGrowth}>{playing ? 'Pause' : 'Play'}</button>
      <button type="button" onClick={replayGrowth}>Replay</button>
    </div>
    <div className="branching-parameter">
      <span><label htmlFor="branching-growth-time">Time</label><output htmlFor="branching-growth-time">{time.toFixed(2)}</output></span>
      <input id="branching-growth-time" type="range" min={0} max={1} step={0.01} value={time} onChange={(event) => setGrowthTime(Number(event.target.value))} />
    </div>
    <output className="branching-status" aria-live="polite">
      {mode === GROWTH_MODES[0] ? 'Together: every piece grows for the whole timeline.' : 'From the base: a piece starts when the piece it hangs from has finished.'}
      {' '}At time {time.toFixed(2)}: {done} of {segments.length} pieces finished, {growing} growing.
    </output>
  </div>
}

export function LodSide() {
  const segments = useAsset()
  const view = useSceneStore((state) => state.params.branchingLodView)
  const lock = useSceneStore((state) => state.params.branchingLodLock)
  const near = useSceneStore((state) => state.params.branchingNearDistance)
  const far = useSceneStore((state) => state.params.branchingFarDistance)
  const distance = useBranchingPlayback((state) => state.distance)
  const levels = useMemo(() => buildLodSet(segments), [segments])
  const chosen = lock === 'Auto' ? chooseLod(distance, near, far) : Number(lock.slice(-1))
  const { requestDistance } = useBranchingPlayback.getState()
  return <div className="branching-side">
    <div className="branching-parameter">
      <span><label htmlFor="branching-distance">Camera distance</label><output htmlFor="branching-distance">{distance.toFixed(1)}</output></span>
      <input id="branching-distance" type="range" min={3} max={30} step={0.5} value={Math.min(30, Math.max(3, distance))} onChange={(event) => requestDistance(Number(event.target.value))} />
    </div>
    <table className="branching-table" aria-label="Detail levels">
      <thead><tr><th>Level</th><th>Sides</th><th>Segments</th><th>Triangles</th></tr></thead>
      <tbody>
        {levels.map((level) => (
          <tr key={level.level} data-current={view === 'By distance' && level.level === chosen}>
            <td>LOD {level.level}</td><td>{level.sides}</td><td>{level.segments.length}</td><td>{level.triangles}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <output className="branching-status" aria-live="polite">
      {view === 'By distance'
        ? `Distance ${distance.toFixed(1)} · drawing LOD ${chosen} · ${levels[chosen].triangles} triangles${lock === 'Auto' ? '' : ' (locked)'}`
        : 'Same asset, same scale, same camera. Switch View to By distance and zoom to see the level change.'}
    </output>
  </div>
}

const SPOT_NAMES = Object.fromEntries(Object.entries(WORK_SPOTS).map(([name, cell]) => [cellKey(cell), name]))

function WorldStatus({ label, world }) {
  return <div className="branching-world" role="group" aria-label={label}>
    <strong>{label} · work: {SPOT_NAMES[cellKey(world.work)]} · {world.time.toFixed(1)} s · work level {world.level.toFixed(2)}</strong>
    <ul>
      {world.residents.map((resident) => (
        <li key={resident.id}>Resident {resident.id}: {statusOf(world, resident)} <span>({resident.reason})</span></li>
      ))}
    </ul>
  </div>
}

export function WorldSide({ actions }) {
  const worlds = useWorldPlayback((state) => state.worlds)
  const running = useWorldPlayback((state) => state.running)
  useWorldPlayback((state) => state.revision)
  const { toggle, stepOnce } = useWorldPlayback.getState()
  if (!worlds) return null
  const log = worlds
    .flatMap((world, index) => world.log.map((entry) => ({ ...entry, from: index === 0 ? 'A' : 'B' })))
    .sort((first, second) => first.time - second.time)
  return <div className="branching-side">
    <div className="branching-buttons">
      <button type="button" className="branching-primary" onClick={toggle}>{running ? 'Pause' : 'Play'}</button>
      <button type="button" onClick={stepOnce} disabled={running}>Step</button>
      <button type="button" onClick={actions.syncReset}>Sync Reset</button>
      <button type="button" onClick={actions.restoreExample}>Restore Example</button>
    </div>
    <div className="branching-worlds">
      <WorldStatus label={`World A (fixed at ${WORLD_A_SPOT})`} world={worlds[0]} />
      <WorldStatus label="World B" world={worlds[1]} />
    </div>
    <ol className="branching-log" role="log" aria-label="Change log">
      {log.length === 0 ? <li>Nothing has changed yet. Press Play.</li> : log.slice(-8).map((entry, index) => (
        <li key={index}><b>{entry.from}</b> · {entry.time.toFixed(1)} s · {entry.text}</li>
      ))}
    </ol>
  </div>
}
