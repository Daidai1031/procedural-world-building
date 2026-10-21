const range = (label, min, max, step, initial) => ({ type: 'float', label, min, max, step, default: initial })
const select = (label, values, initial = values[0]) => ({
  type: 'select', label, default: initial, options: values.map((value) => ({ value, label: value })),
})
const toggle = (label, initial) => ({ type: 'boolean', label, default: initial })

export const branchingParams = {
  branchingAngle: range('Turn angle (degrees)', 15, 120, 5, 45),
  branchingGeneration: range('Generation', 0, 4, 1, 0),
  branchingRule: select('Branching rule', ['Hand-written', 'One side', 'Both sides']),
  branchingForkGeneration: range('Generation', 0, 3, 1, 3),
  branchingShape: select('Shape', ['Equal', 'By depth'], 'By depth'),
  branchingLengthRatio: range('Length kept per level', 0.4, 1, 0.05, 0.7),
  branchingRadiusRatio: range('Thickness kept per level', 0.4, 1.2, 0.05, 0.7),
  branchingDepthColour: toggle('Color by depth', false),
  branchingPreset: select('Design', ['Cave Fan', 'Stone Coral', 'Whisper Root']),
  branchingLook: select('Look', ['Skeleton', 'Solid']),
  branchingAssetGeneration: range('Generation', 0, 3, 1, 3),
  branchingAssetAngle: range('Turn angle (degrees)', 15, 120, 5, 50),
  branchingAssetLengthRatio: range('Length kept per level', 0.4, 1, 0.05, 0.85),
  branchingAssetRadiusRatio: range('Thickness kept per level', 0.4, 1.2, 0.05, 0.75),
  branchingSpread: range('Spatial spread', 0, 1, 0.05, 0.5),
  branchingVariation: range('Variation', 0, 0.5, 0.05, 0.2),
  branchingSeed: range('Seed', 1, 99, 1, 1),
  branchingPreview: toggle('Preview (hide helpers)', false),
  branchingGrowthMode: select('Growth', ['Together', 'From the base']),
  branchingShowFull: toggle('Show full skeleton', true),
  branchingLodView: select('View', ['Side by side', 'By distance']),
  branchingLodLock: select('Level', ['Auto', 'LOD 0', 'LOD 1', 'LOD 2']),
  branchingNearDistance: range('LOD 0 until distance', 3, 20, 0.5, 8),
  branchingFarDistance: range('LOD 1 until distance', 5, 35, 0.5, 14),
  branchingWorkB: select('Work in world B', ['Near the residents', 'Middle', 'Far end']),
  branchingShelter: select('Quiet pockets', ['Open', 'None']),
  branchingNoiseOverlay: toggle('Noise overlay', true),
  branchingRobotWorking: toggle('Robots working', true),
}

export const BRANCHING_DEMOS = [
  'branching-turtle', 'branching-rewrite', 'branching-brackets', 'branching-depth',
  'branching-asset', 'branching-growth', 'branching-lod', 'branching-worlds',
]

export const BRANCHING_PRIMARY_KEYS = {
  'branching-turtle': ['branchingAngle'],
  'branching-rewrite': ['branchingGeneration', 'branchingAngle'],
  'branching-brackets': ['branchingRule', 'branchingForkGeneration', 'branchingAngle'],
  'branching-depth': [
    'branchingForkGeneration', 'branchingAngle', 'branchingShape',
    'branchingLengthRatio', 'branchingRadiusRatio', 'branchingDepthColour',
  ],
  'branching-asset': [
    'branchingPreset', 'branchingLook', 'branchingSpread', 'branchingVariation', 'branchingSeed',
    'branchingAssetAngle', 'branchingAssetGeneration', 'branchingAssetLengthRatio', 'branchingAssetRadiusRatio', 'branchingPreview',
  ],
  'branching-growth': ['branchingGrowthMode', 'branchingLook', 'branchingShowFull'],
  'branching-lod': ['branchingLodView', 'branchingLodLock', 'branchingNearDistance', 'branchingFarDistance'],
  'branching-worlds': ['branchingWorkB', 'branchingShelter', 'branchingRobotWorking', 'branchingNoiseOverlay'],
}
