import { useEffect } from 'react'
import { useSceneStore } from '../../../store/sceneStore.js'

export function useWireframeShortcut() {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return
      if (event.key.toLowerCase() !== 'w') return
      const { params, setParam } = useSceneStore.getState()
      setParam('mapWireframe', !params.mapWireframe)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
