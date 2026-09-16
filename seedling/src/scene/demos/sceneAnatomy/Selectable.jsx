import { cloneElement } from 'react'
import { useSceneStore } from '../../../store/sceneStore.js'

const SELECTED_SCALE = 1.08

export default function Selectable({ id, children }) {
  const isSelected = useSceneStore((state) => state.params.selectedEntity === id)
  const setParam = useSceneStore((state) => state.setParam)

  // Apply scale to the mesh itself: scaling a parent group would also move it.
  return cloneElement(children, {
    scale: isSelected ? SELECTED_SCALE : 1,
    onClick: function select(event) {
      event.stopPropagation()
      setParam('selectedEntity', id)
    },
  })
}
