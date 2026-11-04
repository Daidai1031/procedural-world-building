// D-074: where the 3D camera is looking, written every frame by SkySync and read by the 2D deep-space backdrop.
// Radians, accumulated so the yaw never jumps when the camera passes behind the planet.
export const skyFrame = { yaw: 0, pitch: 0 }
