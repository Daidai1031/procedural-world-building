import { useEffect, useMemo, useState } from 'react'
import NoiseMapPreview from './proceduralMaps/NoiseMapPreview.jsx'
import TerrainPreview from './proceduralMaps/TerrainPreview.jsx'
import SimulationMapPreview from './proceduralMaps/SimulationMapPreview.jsx'
import SimulationTerrainPreview from './proceduralMaps/SimulationTerrainPreview.jsx'
import { DEFAULT_MAP_SETTINGS } from './proceduralMaps/noiseMath.js'
import {
  createErosionState,
  DEFAULT_SIMULATION_SETTINGS,
  getSimulationStats,
  stepHydraulicErosion,
} from './proceduralMaps/simulationMath.js'
import './NoiseTerrainLesson.css'

const NOISE_OPTIONS = [
  { value: 'white', label: 'White' },
  { value: 'value', label: 'Value' },
  { value: 'perlin', label: 'Perlin' },
  { value: 'worley', label: 'Worley' },
]

const SHAPING_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'ridged', label: 'Ridged' },
  { value: 'billow', label: 'Billow' },
  { value: 'turbulence', label: 'Turbulence' },
  { value: 'terracing', label: 'Terracing' },
  { value: 'power', label: 'Power Curve' },
  { value: 'domainWarp', label: 'Domain Warping' },
]

const SIMULATION_SOURCE_SETTINGS = new Set([
  'noiseType',
  'shaping',
  'frequency',
  'octaves',
  'persistence',
  'seed',
  'warpStrength',
])

function InfoGroup({ number, title, description, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = `procedural-maps-section-${number}`

  return (
    <section className={`noise-section ${isOpen ? 'is-open' : ''}`}>
      <button
        className="noise-section__trigger"
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="noise-section__number">{number}</span>
        <span className="noise-section__heading">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className="noise-section__icon" aria-hidden="true">+</span>
      </button>

      {isOpen && (
        <div id={contentId} className="noise-section__content">
          {children}
        </div>
      )}
    </section>
  )
}

function Pipeline({ label, steps }) {
  return (
    <div className="concept-pipeline" aria-label={`${label}: ${steps.join(' to ')}`}>
      <strong>{label}</strong>
      <div className="concept-pipeline__steps">
        {steps.map((step, index) => (
          <span className="concept-pipeline__step" key={step}>
            <code>{step}</code>
            {index < steps.length - 1 && <i aria-hidden="true">→</i>}
          </span>
        ))}
      </div>
    </div>
  )
}

function ConceptList({ children }) {
  return <ul className="concept-list">{children}</ul>
}

function OptionButtons({ label, options, value, onChange }) {
  return (
    <fieldset className="option-control">
      <legend>{label}</legend>
      <div className="option-control__buttons">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function RangeControl({ label, value, min, max, step, onChange, displayValue = value }) {
  return (
    <label className="range-control">
      <span><strong>{label}</strong><output>{displayValue}</output></span>
      <input
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

function SimulationControls({ isRunning, onToggle, onStep, onReset }) {
  return (
    <div className="simulation-controls" aria-label="Simulation controls">
      <button
        className="simulation-controls__primary"
        type="button"
        aria-pressed={isRunning}
        onClick={onToggle}
      >
        {isRunning ? 'Pause erosion' : 'Start erosion'}
      </button>
      <button type="button" onClick={onStep} disabled={isRunning}>Step once</button>
      <button type="button" onClick={onReset}>Reset terrain</button>
    </div>
  )
}

function NeighborhoodDiagram() {
  const cells = ['corner', 'north', 'corner', 'west', 'center', 'east', 'corner', 'south', 'corner']

  return (
    <div className="neighborhood-diagram" aria-label="Four-neighborhood: north, east, south, and west cells surround the current cell">
      {cells.map((cell, index) => (
        <span className={`neighborhood-diagram__cell is-${cell}`} key={`${cell}-${index}`}>
          {cell === 'center' ? 'cell' : cell === 'corner' ? '' : cell}
        </span>
      ))}
    </div>
  )
}

function ProceduralMapsPanel({
  activePart,
  settings,
  simulation,
  simulationSettings,
  simulationStats,
  isSimulationRunning,
  wireframe,
  onPartChange,
  onSettingChange,
  onSimulationSettingChange,
  onToggleSimulation,
  onStepSimulation,
  onResetSimulation,
  onToggleWireframe,
  onNewSeed,
}) {
  return (
    <aside className="noise-panel" aria-label="Procedural maps learning panel">
      <header className="noise-panel__header">
        <span className="noise-panel__kicker">Lesson 02</span>
        <h1 id="procedural-maps-title">Creating Procedural Maps</h1>
        <p>
          Build maps with two different systems: functions that evaluate positions and
          simulations that evolve stored state over time.
        </p>
      </header>

      <nav className="course-part-nav" aria-label="Lesson 02 parts">
        <button type="button" aria-current={activePart === 'functions' ? 'page' : undefined} onClick={() => onPartChange('functions')}>
          <span>2.1</span><strong>Functions</strong>
        </button>
        <button type="button" aria-current={activePart === 'simulation' ? 'page' : undefined} onClick={() => onPartChange('simulation')}>
          <span>2.2</span><strong>Simulation</strong>
        </button>
      </nav>

      {activePart === 'functions' && (
        <>
          <div className="learning-path" aria-label="Assignment 1 learning path">
            <span><small>Step 1</small><strong>Grid</strong></span>
            <i aria-hidden="true">→</i>
            <span><small>Step 2</small><strong>2D Map</strong></span>
            <i aria-hidden="true">→</i>
            <span><small>Step 3</small><strong>3D Map</strong></span>
          </div>
          <div className="noise-recipe" aria-label="Current noise recipe">
            <span><small>Noise</small><strong>{NOISE_OPTIONS.find((option) => option.value === settings.noiseType)?.label}</strong></span>
            <span><small>Shaping</small><strong>{SHAPING_OPTIONS.find((option) => option.value === settings.shaping)?.label}</strong></span>
            <button type="button" onClick={onNewSeed}>New seed · {settings.seed}</button>
          </div>
        </>
      )}

      {activePart === 'simulation' && (
        <div className="simulation-status" aria-live="polite">
          <span className={`simulation-status__dot ${isSimulationRunning ? 'is-running' : ''}`} aria-hidden="true" />
          <span><small>Status</small><strong>{isSimulationRunning ? 'Running' : 'Paused'}</strong></span>
          <span><small>Time step</small><strong>{simulation.iteration}</strong></span>
        </div>
      )}

      <div className="noise-panel__sections" key={activePart}>
        {activePart === 'functions' ? (
          <>
        <InfoGroup number="01" title="Assignment 1 Path" description="Grid → 2D map → 3D map" defaultOpen>
          <p className="concept-copy">
            Assignment 1 is the learning spine for Part 2.1. Start with a grid of sample
            positions, turn those positions into a 2D value map, then use the same values as
            heights in a 3D surface.
          </p>
          <Pipeline label="Function" steps={['position', 'function', 'value']} />
          <Pipeline label="Build sequence" steps={['grid', '2D map', 'height field', '3D map']} />
        </InfoGroup>

        <InfoGroup number="02" title="Start with a Grid" description="Coordinates, cells, vertices, resolution">
          <p className="concept-copy">
            A <strong>grid</strong> organizes sample positions in rows and columns. A cell is the
            space between points; a vertex is one editable point. <strong>Resolution</strong> is
            the number of samples available to represent detail.
          </p>
          <ConceptList>
            <li><strong>X / Z coordinates</strong><span>Locate each sample across the ground plane.</span></li>
            <li><strong>Grid resolution</strong><span>More vertices can show finer detail but require more computation.</span></li>
          </ConceptList>
          <div className="lesson-controls">
            <RangeControl
              label="Grid resolution"
              value={settings.resolution}
              min={24}
              max={128}
              step={8}
              displayValue={`${settings.resolution} × ${settings.resolution}`}
              onChange={(value) => onSettingChange('resolution', value)}
            />
          </div>
        </InfoGroup>

        <InfoGroup number="03" title="Position → Function → Value" description="Randomness and coherent noise">
          <p className="concept-copy">
            A procedural function returns the same value whenever it receives the same position
            and seed. <strong>White noise</strong> is uncorrelated randomness; <strong>coherent
            noise</strong> changes smoothly between nearby positions.
          </p>
          <Pipeline label="One sample" steps={['position (x, z)', 'noise function', 'value 0–1']} />
          <OptionButtons
            label="Noise function"
            options={NOISE_OPTIONS}
            value={settings.noiseType}
            onChange={(value) => onSettingChange('noiseType', value)}
          />
        </InfoGroup>

        <InfoGroup number="04" title="Build the 2D Map" description="Sample every grid position">
          <p className="concept-copy">
            A <strong>2D map</strong> stores one function value at every X/Z grid position. In the
            grayscale preview, black represents 0, white represents 1, and gray values lie between.
          </p>
          <Pipeline label="2D map" steps={['grid position', 'sample noise', 'store value', 'draw pixel']} />
          <ConceptList>
            <li><strong>Noise Scale / Frequency</strong><span>Controls how large or tightly packed the features appear.</span></li>
            <li><strong>Octaves / LOD</strong><span>Layers multiple frequencies to add detail at different sizes.</span></li>
            <li><strong>Persistence / Falloff</strong><span>Controls how strongly each smaller, higher-frequency octave contributes.</span></li>
          </ConceptList>
          <div className="lesson-controls">
            <RangeControl
              label="Frequency"
              value={settings.frequency}
              min={0.08}
              max={1.2}
              step={0.01}
              displayValue={settings.frequency.toFixed(2)}
              onChange={(value) => onSettingChange('frequency', value)}
            />
            <RangeControl
              label="Octaves / LOD"
              value={settings.octaves}
              min={1}
              max={6}
              step={1}
              onChange={(value) => onSettingChange('octaves', value)}
            />
            <RangeControl
              label="Persistence"
              value={settings.persistence}
              min={0.2}
              max={0.8}
              step={0.01}
              displayValue={settings.persistence.toFixed(2)}
              onChange={(value) => onSettingChange('persistence', value)}
            />
          </div>
        </InfoGroup>

        <InfoGroup number="05" title="Build a Noise Stack" description="Families, octaves, amplitude, falloff">
          <p className="concept-copy">
            A <strong>noise stack</strong> combines multiple noise layers. Each octave raises the
            frequency while persistence reduces that octave’s contribution.
          </p>
          <ConceptList>
            <li><strong>White Noise</strong><span>Independent samples with no smooth relationship.</span></li>
            <li><strong>Value Noise</strong><span>Interpolates random grid values into a smooth field.</span></li>
            <li><strong>Perlin Noise</strong><span>Soft, continuous variation suited to rolling natural forms.</span></li>
            <li><strong>Cellular / Worley Noise</strong><span>Measures relationships to scattered feature points, creating cells, cracks, and clustered regions.</span></li>
          </ConceptList>
          <OptionButtons
            label="Noise function"
            options={NOISE_OPTIONS}
            value={settings.noiseType}
            onChange={(value) => onSettingChange('noiseType', value)}
          />
        </InfoGroup>

        <InfoGroup number="06" title="Shaping the Output" description="Transforming noise into designed forms">
          <ConceptList>
            <li><strong>Ridged</strong><span>Folds values into sharp crests and mountain-like ridges.</span></li>
            <li><strong>Billow</strong><span>Creates rounded, cloud-like bulges from the noise.</span></li>
            <li><strong>Turbulence</strong><span>Combines layered absolute noise for energetic, irregular detail.</span></li>
            <li><strong>Terracing</strong><span>Quantizes smooth values into visible elevation steps.</span></li>
            <li><strong>Power Curve</strong><span>Biases values to widen lowlands or emphasize high peaks.</span></li>
            <li><strong>Domain Warping</strong><span>Offsets where the noise is sampled, bending otherwise regular features.</span></li>
          </ConceptList>
          <p className="concept-note">
            Domain warping is grouped here because it was introduced with shaping in class.
            Technically, it modifies the noise input coordinates rather than only modifying the output value.
          </p>
          <OptionButtons
            label="Shaping method"
            options={SHAPING_OPTIONS}
            value={settings.shaping}
            onChange={(value) => onSettingChange('shaping', value)}
          />
          {settings.shaping === 'domainWarp' && (
            <div className="lesson-controls lesson-controls--single">
              <RangeControl
                label="Warp strength"
                value={settings.warpStrength}
                min={0}
                max={6}
                step={0.1}
                displayValue={settings.warpStrength.toFixed(1)}
                onChange={(value) => onSettingChange('warpStrength', value)}
              />
            </div>
          )}
        </InfoGroup>

        <InfoGroup number="07" title="Turn Values into a 3D Map" description="Height fields and vertex displacement">
          <p className="concept-copy">
            A <strong>height field</strong> is a 2D map interpreted as elevation. <strong>Vertex
            displacement</strong> moves every grid vertex upward by its stored value multiplied
            by a height amplitude.
          </p>
          <ConceptList>
            <li><strong>Height amplitude</strong><span>Scales normalized 0–1 values into world-space elevation.</span></li>
            <li><strong>Topology</strong><span>Describes how the terrain vertices and triangles connect.</span></li>
            <li><strong>Normals</strong><span>Are recalculated after displacement so lighting describes the new surface.</span></li>
          </ConceptList>
          <Pipeline label="Noise terrain" steps={['position', 'noise', 'shaping', 'height', 'vertex']} />
          <div className="lesson-controls">
            <RangeControl
              label="Height amplitude"
              value={settings.amplitude}
              min={0}
              max={5}
              step={0.1}
              displayValue={settings.amplitude.toFixed(1)}
              onChange={(value) => onSettingChange('amplitude', value)}
            />
          </div>
        </InfoGroup>

        <InfoGroup number="08" title="Assignment 1 Checkpoint" description="Interactive Terrain Playground">
          <div className="assignment-block">
            <h2>Required</h2>
            <ul className="assignment-checklist">
              <li>Build an interactive terrain playground.</li>
              <li>Generate a height field from coherent noise.</li>
              <li>Displace a grid’s vertices to display the terrain.</li>
              <li>Expose the core noise parameters for exploration.</li>
            </ul>
          </div>
          <div className="assignment-block assignment-block--optional">
            <h2>Optional / Ideas</h2>
            <ul className="assignment-checklist">
              <li>Compare different noise families.</li>
              <li>Add shaping modes such as ridges, terraces, or a power curve.</li>
              <li>Experiment with domain warping, color, water, or lighting.</li>
            </ul>
          </div>
          <p className="concept-note">The complete Assignment 1 brief is recorded in docs/exercise/03-interactive-terrain-playground.md.</p>
        </InfoGroup>
          </>
        ) : (
          <>
            <InfoGroup number="09" title="Run the Simulation" description="Start, pause, step, and reset stored state" defaultOpen>
              <p className="concept-copy">
                Unlike noise, a simulation remembers its previous result. Each click on
                <strong> Step once</strong> runs exactly one update; Start repeats that same update
                automatically.
              </p>
              <Pipeline label="Simulation loop" steps={['current grid state', 'local rules', 'next grid state', 'repeat']} />
              <SimulationControls
                isRunning={isSimulationRunning}
                onToggle={onToggleSimulation}
                onStep={onStepSimulation}
                onReset={onResetSimulation}
              />
              <ConceptList>
                <li><strong>State</strong><span>Three grids are stored: terrain height, water, and carried sediment.</span></li>
                <li><strong>Time step</strong><span>Every cell reads grid(t); all results are written into a separate grid(t+1).</span></li>
                <li><strong>Emergence</strong><span>No rule draws a valley. Valleys appear after many small downhill transfers.</span></li>
              </ConceptList>
            </InfoGroup>

            <InfoGroup number="10" title="Noise → Height Field" description="Assignment 1 becomes the initial state">
              <p className="concept-copy">
                The same seeded noise stack from Part 2.1 initializes every simulation cell.
                A reset samples the noise again, then clears water, sediment, and elapsed time.
              </p>
              <Pipeline label="Initial state" steps={['(x, z)', 'noise stack', 'height[x, z]', 'erosion state']} />
              <ConceptList>
                <li><strong>Height field</strong><span>A 2D grid of normalized values; the 3D mesh reads them as elevation.</span></li>
                <li><strong>Deterministic seed</strong><span>The same seed and settings recreate the same starting terrain.</span></li>
              </ConceptList>
              <button className="concept-action" type="button" onClick={onNewSeed}>New source seed · {settings.seed}</button>
            </InfoGroup>

            <InfoGroup number="11" title="Local Neighborhood" description="Each cell reads north, east, south, and west">
              <p className="concept-copy">
                Each cell compares its surface height (terrain + water) with its four side
                neighbors. Water flows toward the largest downhill drop. Diagonals are omitted,
                so the update rule is easy to trace.
              </p>
              <NeighborhoodDiagram />
              <Pipeline label="One cell update" steps={['read 4 neighbors', 'find steepest drop', 'move water + sediment']} />
              <p className="concept-note">
                Flood Fill uses the same neighborhood idea, but explores a connected region with
                a queue or stack. Erosion instead updates every cell on every timestep.
              </p>
            </InfoGroup>

            <InfoGroup number="12" title="Hydraulic Erosion Rules" description="Rain, flow, erosion, deposition, evaporation">
              <p className="concept-copy">
                Water gains carrying capacity when it moves down a steeper slope. It erodes when
                it can carry more sediment, deposits when it carries too much, then evaporates.
              </p>
              <Pipeline label="Erosion loop" steps={['rain', 'flow', 'erode / deposit', 'transport sediment', 'evaporate']} />
              <div className="lesson-controls">
                <RangeControl
                  label="Rainfall per step"
                  value={simulationSettings.rainfall}
                  min={0.001}
                  max={0.015}
                  step={0.001}
                  displayValue={simulationSettings.rainfall.toFixed(3)}
                  onChange={(value) => onSimulationSettingChange('rainfall', value)}
                />
                <RangeControl
                  label="Erosion strength"
                  value={simulationSettings.erosionStrength}
                  min={0.05}
                  max={0.7}
                  step={0.01}
                  displayValue={simulationSettings.erosionStrength.toFixed(2)}
                  onChange={(value) => onSimulationSettingChange('erosionStrength', value)}
                />
                <RangeControl
                  label="Evaporation"
                  value={simulationSettings.evaporation}
                  min={0.02}
                  max={0.35}
                  step={0.01}
                  displayValue={`${Math.round(simulationSettings.evaporation * 100)}%`}
                  onChange={(value) => onSimulationSettingChange('evaporation', value)}
                />
                <RangeControl
                  label="Updates per second"
                  value={simulationSettings.stepsPerSecond}
                  min={2}
                  max={20}
                  step={1}
                  onChange={(value) => onSimulationSettingChange('stepsPerSecond', value)}
                />
              </div>
            </InfoGroup>

            <InfoGroup number="13" title="Calibration" description="Balance map scale, simulation cells, and mesh vertices">
              <p className="concept-copy">
                Calibration makes three scales agree. Simulation resolution controls the rule's
                cell size; terrain resolution controls display detail; height amplitude controls
                vertical exaggeration. They solve different problems.
              </p>
              <div className="lesson-controls">
                <RangeControl
                  label="Simulation resolution"
                  value={simulationSettings.resolution}
                  min={24}
                  max={72}
                  step={8}
                  displayValue={`${simulationSettings.resolution} × ${simulationSettings.resolution}`}
                  onChange={(value) => onSimulationSettingChange('resolution', value)}
                />
                <RangeControl
                  label="Terrain mesh resolution"
                  value={settings.resolution}
                  min={24}
                  max={128}
                  step={8}
                  displayValue={`${settings.resolution} × ${settings.resolution}`}
                  onChange={(value) => onSettingChange('resolution', value)}
                />
                <RangeControl
                  label="World size"
                  value={simulationSettings.worldSize}
                  min={6}
                  max={18}
                  step={1}
                  displayValue={`${simulationSettings.worldSize} units`}
                  onChange={(value) => onSimulationSettingChange('worldSize', value)}
                />
                <RangeControl
                  label="Height amplitude"
                  value={settings.amplitude}
                  min={0.5}
                  max={5}
                  step={0.1}
                  displayValue={settings.amplitude.toFixed(1)}
                  onChange={(value) => onSettingChange('amplitude', value)}
                />
              </div>
              <dl className="calibration-readout">
                <div><dt>Cell spacing</dt><dd>{simulationStats.cellSize.toFixed(2)} units</dd></div>
                <div><dt>Simulation cells</dt><dd>{simulationStats.cellCount.toLocaleString()}</dd></div>
                <div><dt>Mesh vertices</dt><dd>{((settings.resolution + 1) ** 2).toLocaleString()}</dd></div>
                <div><dt>Height range</dt><dd>{simulationStats.minimumHeight.toFixed(2)}–{simulationStats.maximumHeight.toFixed(2)}</dd></div>
              </dl>
              <p className="concept-note">
                A good starting rule: keep mesh resolution at least as high as simulation
                resolution. Raising only mesh resolution smooths the display; it does not add new
                simulated detail.
              </p>
            </InfoGroup>

            <InfoGroup number="14" title="Assignment 2 Checkpoint" description="Required work complete + optional visualization tools">
              <div className="assignment-block">
                <h2>Implemented</h2>
                <ul className="assignment-checklist is-complete">
                  <li>Add a simulation map section with Start / Stop.</li>
                  <li>Create a height field driven by the noise stack.</li>
                  <li>Calibrate terrain and map resolution for believable topography.</li>
                </ul>
              </div>
              <div className="assignment-block assignment-block--optional">
                <h2>Optional additions implemented</h2>
                <ul className="assignment-checklist is-complete">
                  <li>Height-based material / shader.</li>
                  <li>Wireframe shortcut.</li>
                </ul>
              </div>
              <Pipeline label="Overall pipeline" steps={['Noise Stack', 'Height Field', 'Simulation', 'Updated Height Field', '3D Terrain']} />
              <button className="concept-action" type="button" aria-pressed={wireframe} onClick={onToggleWireframe}>
                {wireframe ? 'Hide wireframe' : 'Show wireframe'} · W
              </button>
            </InfoGroup>
          </>
        )}
      </div>
    </aside>
  )
}

function ProceduralMapsScene({
  activePart,
  settings,
  simulation,
  simulationSettings,
  simulationStats,
  isSimulationRunning,
  wireframe,
}) {
  if (activePart === 'simulation') {
    return (
      <section className="noise-scene simulation-scene" aria-label="Linked simulation state and eroded terrain previews">
        <div className="preview-intro">
          <span>grid(t) → local rule → grid(t+1)</span>
          <strong>{isSimulationRunning ? 'Erosion is evolving' : `Paused at timestep ${simulation.iteration}`}</strong>
        </div>
        <div className="preview-grid">
          <SimulationMapPreview simulation={simulation} isRunning={isSimulationRunning} />
          <SimulationTerrainPreview
            simulation={simulation}
            settings={simulationSettings}
            mapSettings={settings}
            wireframe={wireframe}
          />
        </div>
        <div className="simulation-metrics" aria-label="Live simulation measurements">
          <span><small>State</small><strong>{simulation.size}² cells</strong></span>
          <span><small>Water</small><strong>{simulationStats.totalWater.toFixed(1)}</strong></span>
          <span><small>Height range</small><strong>{simulationStats.minimumHeight.toFixed(2)}–{simulationStats.maximumHeight.toFixed(2)}</strong></span>
          <span><small>Display</small><strong>{settings.resolution}² segments</strong></span>
        </div>
      </section>
    )
  }

  return (
    <section className="noise-scene" aria-label="Linked two-dimensional and three-dimensional noise previews">
      <div className="preview-intro">
        <span>Same function · same coordinates</span>
        <strong>2D values become 3D height</strong>
      </div>
      <div className="preview-grid">
        <NoiseMapPreview settings={settings} />
        <TerrainPreview settings={settings} />
      </div>
    </section>
  )
}

export default function ProceduralMapsLesson() {
  const [activePart, setActivePart] = useState('simulation')
  const [settings, setSettings] = useState(DEFAULT_MAP_SETTINGS)
  const [simulationSettings, setSimulationSettings] = useState(DEFAULT_SIMULATION_SETTINGS)
  const [simulation, setSimulation] = useState(() => (
    createErosionState(DEFAULT_MAP_SETTINGS, DEFAULT_SIMULATION_SETTINGS)
  ))
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)
  const [wireframe, setWireframe] = useState(false)
  const simulationStats = useMemo(
    () => getSimulationStats(simulation, simulationSettings.worldSize),
    [simulation, simulationSettings.worldSize],
  )

  useEffect(() => {
    if (!isSimulationRunning || activePart !== 'simulation') return undefined

    const interval = window.setInterval(() => {
      setSimulation((current) => stepHydraulicErosion(current, simulationSettings))
    }, 1000 / simulationSettings.stepsPerSecond)

    return () => window.clearInterval(interval)
  }, [activePart, isSimulationRunning, simulationSettings])

  useEffect(() => {
    function handleWireframeShortcut(event) {
      const target = event.target
      const isTyping = target instanceof HTMLElement && (
        target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
      )

      if (!isTyping && event.key.toLowerCase() === 'w') setWireframe((current) => !current)
    }

    window.addEventListener('keydown', handleWireframeShortcut)
    return () => window.removeEventListener('keydown', handleWireframeShortcut)
  }, [])

  function updateSetting(name, value) {
    const nextSettings = { ...settings, [name]: value }
    setSettings(nextSettings)

    if (SIMULATION_SOURCE_SETTINGS.has(name)) {
      setIsSimulationRunning(false)
      setSimulation(createErosionState(nextSettings, simulationSettings))
    }
  }

  function updateSimulationSetting(name, value) {
    const nextSettings = { ...simulationSettings, [name]: value }
    setSimulationSettings(nextSettings)

    if (name === 'resolution' || name === 'worldSize') {
      setIsSimulationRunning(false)
      setSimulation(createErosionState(settings, nextSettings))
    }
  }

  function changePart(part) {
    if (part !== 'simulation') setIsSimulationRunning(false)
    setActivePart(part)
  }

  function stepSimulation() {
    setSimulation((current) => stepHydraulicErosion(current, simulationSettings))
  }

  function resetSimulation() {
    setIsSimulationRunning(false)
    setSimulation(createErosionState(settings, simulationSettings))
  }

  return (
    <div className="noise-workspace" aria-labelledby="procedural-maps-title">
      <ProceduralMapsPanel
        activePart={activePart}
        settings={settings}
        simulation={simulation}
        simulationSettings={simulationSettings}
        simulationStats={simulationStats}
        isSimulationRunning={isSimulationRunning}
        wireframe={wireframe}
        onPartChange={changePart}
        onSettingChange={updateSetting}
        onSimulationSettingChange={updateSimulationSetting}
        onToggleSimulation={() => setIsSimulationRunning((current) => !current)}
        onStepSimulation={stepSimulation}
        onResetSimulation={resetSimulation}
        onToggleWireframe={() => setWireframe((current) => !current)}
        onNewSeed={() => updateSetting('seed', settings.seed + 1)}
      />
      <ProceduralMapsScene
        activePart={activePart}
        settings={settings}
        simulation={simulation}
        simulationSettings={simulationSettings}
        simulationStats={simulationStats}
        isSimulationRunning={isSimulationRunning}
        wireframe={wireframe}
      />
    </div>
  )
}
