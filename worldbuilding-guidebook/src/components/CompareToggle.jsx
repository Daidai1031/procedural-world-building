import { useRef } from 'react'
import { useSceneStore } from '../store/sceneStore.js'

export default function CompareToggle() {
  const compare = useSceneStore((state) => state.compare)
  const side = useSceneStore((state) => state.compareSide)
  const selectCompare = useSceneStore((state) => state.selectCompare)
  const buttons = useRef({})
  if (!compare) return null

  function handleKeyDown(event) {
    const target = { ArrowLeft: 'a', ArrowRight: 'b', Home: 'a', End: 'b' }[event.key]
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
    selectCompare(target)
    buttons.current[target].focus()
  }

  return (
    <div className="compare-toggle" role="radiogroup" aria-label={compare.label} onKeyDown={handleKeyDown}>
      {['a', 'b'].map((key) => (
        <button
          ref={(button) => { buttons.current[key] = button }}
          key={key}
          type="button"
          role="radio"
          aria-checked={side === key}
          tabIndex={side === key ? 0 : -1}
          onClick={() => selectCompare(key)}
        >
          {compare[key].caption}
        </button>
      ))}
    </div>
  )
}
