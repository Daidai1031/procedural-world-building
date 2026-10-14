import { resourceColors } from './resourceColors'

// VIS-01, D-027: every color agreed on the component board, in one place.
// Terrain, atmosphere and model code read these tokens; nothing else hard-codes a color.
export const palette = {
  background: '#F3F1EB',
  light: { sky: '#ffffff', ground: '#b8b5ae' },
  // Surface C: height + slope value, contour lines every `tuning.visual.contour.spacing`.
  terrain: {
    low: '#6b6964',
    high: '#bdbab3',
    steep: '#4a4946',
    contour: '#3b3a37',
  },
  // Atmosphere C4: cool gray dust that hugs the terrain.
  atmosphere: '#9fadb5',
  // Shared robot body and parts; each role has its own band color.
  robot: {
    body: '#e4e1d8',
    graphite: '#3b3a37',
    charcoal: '#2c2c2b',
    debris: '#77746f',
    soil: '#8f8a80',
    band: { miner: '#3b3a37', gardener: '#6b8160', builder: '#8c7a5c' },
  },
  // One status light per robot (AUT-10).
  state: {
    scan: '#ece7da',
    move: '#c98a2b',
    work: '#c98a2b',
    collect: resourceColors.mineral,
    plant: '#7fa36b',
    blocked: '#9c3d22',
  },
  vegetation: {
    lichen: ['#7f8d6c', '#97a083', '#66805a', '#3f9a58', '#a7ab95'],
    stem: '#56624b',
    tip: resourceColors.life,
  },
  antenna: { frame: '#3b3a37', dish: '#e4e1d8', lamp: '#c98a2b' },
  resource: resourceColors,
  // Dark gold self-light so crystals stay readable on the shadow side.
  crystalGlow: '#5a4508',
} as const

export type RobotStateColor = keyof typeof palette.state
