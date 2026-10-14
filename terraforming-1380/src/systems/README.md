# systems

Pure fixed-step simulation over the voxel world and run store; React only displays it.

- `simulation.ts`: one step in order (Miners, Gardener, Builder, plant growth).
- `miner.ts`: the autonomous Miner (AUT-01–12, D-023).
- `gardener.ts`: the Gardener, planting and raising antennas (AUT-14/15, D-025).
- `builder.ts`: the Builder, cutting and filling toward one level with the shared soil stock (AUT-17, D-026).
- `structures.ts`: plants and antennas, ground rules, growth, spread and removal by terrain edits (AUT-16).
- `geometry.ts`: shared vectors, surface search and hover-shell travel.
