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
  // D-060: planet materials. `scar` is the color of ground that remembers an edit (D-061).
  surface: {
    rock: { scar: '#d9d5cb' },
    metal: { low: '#868b92', high: '#d3d6d9', steep: '#62666d', contour: '#3f4247', scar: '#f4f3ee' },
    plastic: { bands: ['#c4200e', '#e29400', '#008a74', '#1a48bd'], contour: '#fff8e8', scar: '#f8f1e4',
      micro: ['#c4200e', '#e29400', '#008a74', '#1a48bd', '#d9468f'] },
    fur: { low: '#b98f69', high: '#ecd3b3', steep: '#9a7355', contour: '#7f5f47', scar: '#fbf4e6', skin: '#e6c2ad' },
    jelly: { low: '#f7a3b8', high: '#ffd3dc', steep: '#ea7f9c', contour: '#c44369', scar: '#fff1f4', attenuation: '#f0668c' },
    ice: { low: '#6fb1cf', high: '#a9d7e8', steep: '#4d94b8', contour: '#3f7f9f', scar: '#ffffff', attenuation: '#4fa9d6' },
    // What polished materials reflect: the paper page above, dark space below.
    space: { zenith: '#f3f1eb', nadir: '#1d2026', star: '#ffffff' },
  },
  // D-064: the Quiet Drifter, from the turnaround sheet's material palette. `seam` and `roseDeep` are shades of the
  // sheet's ivory and dusty red for the backpack seams and the brooch's spiral centre.
  drifter: {
    ivory: '#efe9dc',
    seam: '#d8d0bf',
    cuff: '#e0ad4c',
    boot: '#a9a59d',
    face: '#353331',
    eye: '#fff8e9',
    rose: '#c96a62',
    roseDeep: '#a9504d',
    leaf: '#93ab7d',
    stem: '#7a9467',
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
  // D-070: the ground graph's layers. Desire paths are faint, roads dark, blocked ground rust, the picked edge amber.
  road: { path: '#c9b98f', road: '#47443d', blocked: '#b3472f', pick: '#e3a22f', cold: '#d9d3c3', warm: '#d9732b', node: '#6b6a62' },
  system: { arc: '#454641', ghost: '#3b3a37', wire: '#8a887f', wireHover: '#3a3b36', residentGlow: '#e0b070', rail: '#c9892f' },
  resource: resourceColors,
  // Dark gold self-light so crystals stay readable on the shadow side.
  crystalGlow: '#5a4508',
} as const

export type RobotStateColor = keyof typeof palette.state
