# content

Authored, hot-reloadable game data. Simulation rules belong in `systems`; numeric balance belongs in `config/tuning.ts`.

- `residents.ts`: native species identities, characters and authored native planets. `systems/residents.ts` (`planetSpecies`) picks each signal planet's species from the native planets (D-059); the numbers behind each character are in `config/tuning.ts` (`residents.temperament`).
