import { useSceneStore } from '../store/sceneStore.js'
import { branchingParams } from '../scene/demos/branching/params.js'

// One control for one scene setting: a slider, a menu or a check box, chosen by
// the setting's own definition. `onChange` lets a panel do more than store the
// value, for example applying a whole design when the design menu changes.
export default function BranchingParameter({ name, disabled = false, onChange }) {
  const value = useSceneStore((state) => state.params[name])
  const setParam = useSceneStore((state) => state.setParam)
  const definition = branchingParams[name]
  const id = `branching-control-${name}`
  const change = onChange ?? ((next) => setParam(name, next))
  if (definition.type === 'boolean') {
    return <label className="branching-parameter branching-parameter--toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={value} onChange={(event) => change(event.target.checked)} />
      <span>{definition.label}</span>
    </label>
  }
  if (definition.type === 'select') {
    return <div className="branching-parameter">
      <span><label htmlFor={id}>{definition.label}</label></span>
      <select id={id} value={value} onChange={(event) => change(event.target.value)}>
        {definition.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  }
  return <div className="branching-parameter">
    <span><label htmlFor={id}>{definition.label}</label><output htmlFor={id}>{value}</output></span>
    <input id={id} type="range" min={definition.min} max={definition.max} step={definition.step} value={value} disabled={disabled} onChange={(event) => change(Number(event.target.value))} />
  </div>
}
