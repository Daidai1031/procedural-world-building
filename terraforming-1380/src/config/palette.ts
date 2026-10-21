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
    band: { miner: '#3b3a37', gardener: '#6b8160', builder: '#8c7a5c', rigger: '#6f8794' },
  },
  // Residents stay mineral and tactile, but each family now has a recognisable hue instead of sharing one pale neutral.
  resident: {
    rock: {
      gray: ['#918b9c', '#a59aac', '#7a778b', '#b5a9b5', '#686777'],
      sand: ['#d9b079', '#c99662', '#e6c891', '#b77b54'],
      rose: ['#d68f83', '#c87378', '#e4aaa0', '#ad626d'],
      slate: ['#7289a8', '#60799a', '#8fa5bc', '#526482'],
      basalt: ['#4d495b', '#3e4052', '#5b5669', '#343746'],
      umber: ['#98705b', '#aa7d5c', '#7f5b52', '#b68b68'],
      sage: ['#85a486', '#73967d', '#a4b995', '#66877a'],
      moss: ['#5f865b', '#78985f', '#47795d', '#9aa86a'],
    },
    strata: {
      rose: [['#e0a092', '#d78b83'], ['#c76f73', '#b95e68'], ['#edbbb0'], ['#9f5362']],
      sand: [['#e5bd7f', '#dcaa6e'], ['#c88c55', '#b9784c'], ['#f0d39b'], ['#a96342']],
      slate: [['#8da5c2', '#7f98b7'], ['#60799d'], ['#a9bed0'], ['#4e6285']],
    },
    accent: {
      graphite: '#34313c',
      mint: '#72d7ad',
      eyeWhite: '#fff8e9',
      eyeInk: '#272331',
      sprout: '#4f814e',
      leaf: ['#63a455', '#86b85f'],
      flower: '#df76ad',
      softBody: ['#edc7a8', '#e9bfc2', '#d8cfaa'],
      crystal: ['#f0ca55', '#79cde0', '#df82c1', '#88d59f'],
    },
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
    tip: '#3f9a58',
  },
  antenna: { frame: '#3b3a37', dish: '#e4e1d8', lamp: '#c98a2b' },
  // System view (D-049): arcs, ghost shells, unvisited outlines and resident glows.
  system: { arc: '#454641', ghost: '#3b3a37', wire: '#8a887f', wireHover: '#3a3b36', residentGlow: '#e0b070' },
  resource: resourceColors,
  // Dark gold self-light so crystals stay readable on the shadow side.
  crystalGlow: '#5a4508',
} as const

export type RobotStateColor = keyof typeof palette.state
