import { useSceneStore } from '../store/sceneStore.js'
import { safeContext } from './context.js'

export function stepContext(step) {
  return safeContext({ stepId: step.id, stepTitle: step.frontmatter.title, params: useSceneStore.getState().params, task: step.frontmatter.practice })
}
