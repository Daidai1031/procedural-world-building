import SceneAnatomyLesson from './SceneAnatomyLesson.jsx'
import ProceduralMapsLesson from './NoiseTerrainLesson.jsx'

// Add each new lesson here to include it in the navigation and lesson view.
export const lessons = [
  { id: 'scene-anatomy', number: '01', title: 'Scene Anatomy', component: SceneAnatomyLesson },
  { id: 'procedural-maps', number: '02', title: 'Creating Procedural Maps', component: ProceduralMapsLesson },
]
