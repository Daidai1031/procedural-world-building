import { voxelParams } from '../voxels/params.js'

export const shaderLabParams = {
  voxelShape: voxelParams.voxelShape,
  voxelResolution: voxelParams.voxelResolution,
  shaderMode: {
    type: 'select', label: 'Shader strategy', default: 'standard',
    options: [
      { value: 'standard', label: 'Standard material' },
      { value: 'flat', label: 'Flat colour shader' },
    ],
  },
}
