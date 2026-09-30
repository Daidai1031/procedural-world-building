import { voxelParams } from '../voxels/params.js'

export const shaderLabParams = {
  voxelShape: voxelParams.voxelShape,
  voxelResolution: voxelParams.voxelResolution,
  shaderMode: {
    type: 'select', label: 'Shader strategy', default: 'standard',
    options: [
      { value: 'standard', label: 'Standard material' },
      { value: 'flat', label: 'Flat colour shader' },
      { value: 'height', label: 'Height gradient shader' },
      { value: 'heightSlope', label: 'Height + slope shader' },
      { value: 'distance', label: 'Distance shader' },
      { value: 'fresnel', label: 'Fresnel shader' },
      { value: 'matcap', label: 'MatCap shader' },
      { value: 'water', label: 'Water diagnostic shader' },
      { value: 'displacement', label: 'Vertex displacement shader' },
    ],
  },
  // Step 03 reuses this for its comparison; step 01 does not unlock it, so it
  // never shows up while standard/flat are the only modes being compared.
  // Measured: the "ground" shape's heightRatio only ever reaches about 0.30 to
  // 0.69, so the range and default sit inside that instead of a round-looking
  // but unreachable 0.55-0.95.
  shaderSnowLine: {
    type: 'float', label: 'Snow line', min: 0.35, max: 0.65, step: 0.05, default: 0.55,
  },
  // Step 04 reuses this for its comparison; step 01 does not unlock it, so it
  // never shows up while standard/flat are the only modes being compared.
  // Measured: on the "ground" shape, real hillside steepness runs 0 to about
  // 0.37 and then jumps straight to about 0.95 (the box's own cut-away
  // walls) with nothing in between. A range up to 0.85 spent most of its
  // slider inside that empty gap, unable to change anything on the hills.
  shaderSlopeThreshold: {
    type: 'float', label: 'Rock threshold', min: 0.05, max: 0.4, step: 0.05, default: 0.2,
  },
  // Step 05 reuses these for its comparison; step 01 does not unlock them.
  shaderScanRadius: {
    type: 'float', label: 'Scan radius', min: 0.5, max: 3, step: 0.25, default: 1.5,
  },
  shaderRimPower: {
    type: 'float', label: 'Rim power', min: 1, max: 6, step: 0.5, default: 2.5,
  },
  // Step 06 reuses this for its comparison; step 01 does not unlock it.
  shaderMatcapAngle: {
    type: 'float', label: 'Highlight angle', min: 0, max: 330, step: 30, default: 45,
  },
  // Step 07 reuses this for its comparison; step 01 does not unlock it.
  // Measured: the deepest puddle the "ground" height field ever traps is
  // about 0.384 world units (normalized to 1.0 in the water texture), and
  // 19.7% of cells hold any water at all. A range up to 1.0 would spend most
  // of its slider past where any real puddle reaches.
  shaderPuddleThreshold: {
    type: 'float', label: 'Puddle threshold', min: 0, max: 0.6, step: 0.05, default: 0.1,
  },
  // Step 08 reuses this for its comparison; step 01 does not unlock it.
  // Range chosen by looking, not by measuring a real distribution — there is
  // no "correct" ripple height. Above 0.6 the wave starts to poke through
  // the terrain's own silhouette at the default resolution, which reads as
  // broken rather than as a bigger ripple.
  shaderRippleAmplitude: {
    type: 'float', label: 'Ripple amplitude', min: 0, max: 0.6, step: 0.05, default: 0.25,
  },
}

// Step 02's compare toggle flips this, so it never needs a control of its own
// in the strip.
export const coordinateSpaceParams = {
  coordinateSpace: {
    type: 'select', label: 'Stripe space', default: 'local', hideFromStrip: true,
    options: [
      { value: 'local', label: 'Local position' },
      { value: 'world', label: 'World position' },
    ],
  },
  // 0.4 is deliberate: the chunk width (6 world units) is not a whole number
  // of stripe periods at this frequency, so local space visibly breaks at the
  // seam by default instead of coincidentally lining up.
  coordinateStripeFrequency: {
    type: 'float', label: 'Stripe frequency', min: 0.2, max: 1.2, step: 0.1, default: 0.4,
  },
}
