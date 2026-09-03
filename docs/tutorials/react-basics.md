# React Basics (Beginner)

> For the Delirious NYC project: use React to build the browser UI, then integrate a Three.js 3D scene later.

## What You Will Learn

- What React is and why this project uses it
- How to create and run your first React project
- Core concepts: components, JSX, props, and state
- A simple "city data panel" example tied to the project direction

## Prerequisites

| Skill | Required? | Notes |
|-------|-----------|-------|
| HTML | Recommended | Page structure (headings, paragraphs, buttons) |
| CSS | Recommended | Styling (colors, layout) |
| JavaScript | Required | Variables, functions, arrays, objects |
| React | Not required | We start from zero |

If JavaScript feels rusty, spend 1–2 days on: variables, `function`, arrow functions `() => {}`, and array `.map()`.

---

## 1. What Is React?

**React** is a JavaScript library for building user interfaces (UI).

On a traditional webpage, changing button text often means manually finding and updating DOM elements.

React's idea: **UI = data + components**. When data changes, the UI updates automatically.

```
data (state)  →  React re-renders  →  UI on screen
```

### Why Delirious NYC Uses React

According to the project backlog, you need to:

- Display district data such as rent, population, and tourism index
- Handle player clicks, voting, and history timelines
- Work alongside a Three.js 3D scene (React for UI, Three.js for 3D)

React fits this kind of data-driven interactive interface well.

---

## 2. Environment Setup

### Install Node.js

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download and install the **LTS (Long Term Support)** version
3. Open a terminal (PowerShell on Windows) and verify:

```bash
node --version
npm --version
```

You should see version numbers (for example, `v20.x.x`).

### Create Your First React Project (Vite Recommended)

In the terminal, navigate to the folder where you want the project, then run:

```bash
npm create vite@latest my-first-react -- --template react
cd my-first-react
npm install
npm run dev
```

The terminal will show a local URL (usually `http://localhost:5173`). Open it in your browser.

### Important Project Files

```
my-first-react/
├── index.html          # Entry HTML
├── src/
│   ├── main.jsx        # Mounts App onto the page
│   ├── App.jsx         # Main component (start editing here)
│   ├── App.css         # Styles specific to App
│   ├── index.css       # Global page and root styles
│   └── assets/         # Images/SVGs imported by source code
└── package.json        # Dependencies and scripts
```

**Habit:** Edit `src/App.jsx`. The browser refreshes automatically when you save.

### How the files load each other

```text
index.html
    └── loads /src/main.jsx
            ├── imports index.css
            └── renders App.jsx
                    └── imports App.css
```

| File | Responsibility | Why it is separate |
| --- | --- | --- |
| `index.html` | Supplies `<div id="root">` and loads `main.jsx` | It is the browser's initial HTML document |
| `src/main.jsx` | Creates the React root and renders `<App />` | Keeps one-time application startup separate from UI code |
| `src/App.jsx` | Defines components, content, state, events, and application structure | This is where the app's behavior and composition live |
| `src/index.css` | Sets global defaults for `html`, `body`, and `#root` | Global rules should not be tied to one component |
| `src/App.css` | Styles elements rendered by `App.jsx` | Component/page styling can evolve without mixing it into behavior |
| `src/assets/` | Stores images, SVGs, or fonts imported by JSX/CSS | Vite can fingerprint and bundle imported assets |

These exact filenames are a convention, not a law. `main.jsx` is required by the current `index.html`, but components and styles can be split into more files as the project grows. An asset is not included in the built app merely because it is inside `assets`; it must be imported somewhere.

---

## 3. JSX: HTML Inside JavaScript

React uses **JSX** to describe UI. It looks like HTML but is JavaScript.

```jsx
function App() {
  return (
    <div>
      <h1>Hello, Delirious NYC!</h1>
      <p>Welcome to the procedural city simulation.</p>
    </div>
  );
}

export default App;
```

### JSX and CSS solve different problems

| JSX (`.jsx`) | CSS (`.css`) |
| --- | --- |
| Creates elements and React components | Selects those elements and changes their appearance/layout |
| Contains JavaScript expressions, state, arrays, and event handlers | Contains declarative style rules and media queries |
| Decides whether something exists | Decides how an existing element looks and where it is placed |
| Is transformed by Vite into browser JavaScript | Is bundled by Vite when imported from JSX or another stylesheet |

The connection between them is usually a class name:

```jsx
// App.jsx: creates the element and assigns a class
<aside className="learning-panel">Scene information</aside>
```

```css
/* App.css: styles every element with that class */
.learning-panel {
  position: absolute;
  right: 18px;
  width: 390px;
}
```

If the JSX is removed, the panel does not exist. If the CSS is removed, the panel still exists but loses this layout and appearance. Importing `./App.css` from `App.jsx` tells Vite to include those styles.

### JSX Rules (Common Beginner Mistakes)

1. **Return only one root element** (or wrap multiple elements in `<>...</>`)
2. **Use `className` instead of `class`**
3. **Put JavaScript expressions inside `{}`**

```jsx
const cityName = "New York";
const rent = 3200;

return (
  <div className="panel">
    <h2>{cityName}</h2>
    <p>Average rent: ${rent}</p>
  </div>
);
```

---

## 4. Components: Building Blocks of UI

A **component** is a reusable piece of UI. It is essentially a function that returns JSX.

```jsx
// Small component: display one city stat
function StatRow({ label, value }) {
  return (
    <div>
      <strong>{label}:</strong> {value}
    </div>
  );
}

// Larger component: combine multiple StatRows
function NeighborhoodPanel() {
  return (
    <div>
      <h2>Brooklyn · Williamsburg</h2>
      <StatRow label="Rent" value="$3,200" />
      <StatRow label="Population" value="45,000" />
      <StatRow label="Tourism Index" value="78" />
    </div>
  );
}
```

**Naming convention:** Component names start with a capital letter (`StatRow`, not `statRow`).

---

## 5. Props: Passing Data from Parent to Child

**Props** (properties) are like function arguments passed from parent to child. They are **read-only** — child components should not mutate props directly.

```jsx
function StatRow({ label, value, unit = "" }) {
  return (
    <p>
      {label}: {value}{unit}
    </p>
  );
}

function App() {
  return (
    <div>
      <StatRow label="Rent" value={3200} unit="/mo" />
      <StatRow label="Satisfaction" value={62} unit="%" />
    </div>
  );
}
```

---

## 6. State: Data That Changes

To respond to clicks, simulation ticks, and other interactions, you need **state**.

Use the Hook: `useState`

```jsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Current count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        +1
      </button>
    </div>
  );
}
```

- `count`: the current value
- `setCount`: the function to update count (always use the setter; do not write `count = count + 1`)
- Calling `setCount` triggers a re-render

### Updating Object State

```jsx
const [neighborhood, setNeighborhood] = useState({
  name: "Williamsburg",
  rent: 3200,
  tourism: 78,
});

// Update one field while keeping the rest
setNeighborhood({
  ...neighborhood,
  rent: neighborhood.rent + 100,
});
```

`...neighborhood` is the spread operator — it copies the existing object.

---

## 7. Event Handling

```jsx
function RentButton() {
  const [rent, setRent] = useState(3000);

  function handleRentIncrease() {
    setRent(rent + 200);
  }

  return (
    <div>
      <p>Rent: ${rent}</p>
      <button onClick={handleRentIncrease}>
        Simulate Rent Increase
      </button>
    </div>
  );
}
```

Note: `onClick={handleRentIncrease}` passes a **function reference**. Do not write `onClick={handleRentIncrease()}` — that runs the function immediately.

---

## 8. Conditional Rendering and Lists

### Conditional Display

```jsx
{isProtest && <p>⚠️ This district is protesting!</p>}

{score > 70 ? <span>High attention</span> : <span>Low attention</span>}
```

### Rendering Lists (with `.map()`)

```jsx
const districts = [
  { id: 1, name: "Williamsburg", rent: 3200 },
  { id: 2, name: "Harlem", rent: 2100 },
  { id: 3, name: "Times Square", rent: 4500 },
];

return (
  <ul>
    {districts.map((d) => (
      <li key={d.id}>
        {d.name} — ${d.rent}
      </li>
    ))}
  </ul>
);
```

**`key`**: helps React identify list items; use a unique id when possible.

---

## 9. Full Example: Mini City Panel

Combine everything above (paste into `App.jsx` to practice):

```jsx
import { useState } from "react";
import "./App.css";

function DistrictCard({ district, onSelect, selected }) {
  return (
    <button
      className={selected ? "card selected" : "card"}
      onClick={() => onSelect(district.id)}
    >
      <h3>{district.name}</h3>
      <p>Rent: ${district.rent}</p>
      <p>Tourism: {district.tourism}</p>
    </button>
  );
}

function App() {
  const [districts, setDistricts] = useState([
    { id: 1, name: "Williamsburg", rent: 3200, tourism: 78 },
    { id: 2, name: "Harlem", rent: 2100, tourism: 45 },
    { id: 3, name: "Times Square", rent: 4500, tourism: 95 },
  ]);

  const [selectedId, setSelectedId] = useState(null);

  function simulateTourismSpike() {
    setDistricts(
      districts.map((d) =>
        d.id === selectedId
          ? { ...d, tourism: Math.min(100, d.tourism + 10) }
          : d
      )
    );
  }

  const selected = districts.find((d) => d.id === selectedId);

  return (
    <div className="app">
      <h1>Delirious NYC — Mini Panel</h1>

      <div className="cards">
        {districts.map((d) => (
          <DistrictCard
            key={d.id}
            district={d}
            selected={d.id === selectedId}
            onSelect={setSelectedId}
          />
        ))}
      </div>

      {selected ? (
        <div className="detail">
          <h2>{selected.name}</h2>
          <button onClick={simulateTourismSpike}>
            Simulate Tourism Spike (+10 tourism index)
          </button>
        </div>
      ) : (
        <p>Click a district to view details</p>
      )}
    </div>
  );
}

export default App;
```

This example covers **component composition, props, state, events, lists, and conditional rendering** — aligned with the backlog goals of selecting districts, showing conditions, and player intervention.

---

## 10. Quick Reference

| Concept | One-line summary |
|---------|------------------|
| Component | A function that returns JSX; a UI building block |
| JSX | HTML-like syntax written inside JavaScript |
| Props | Data passed parent → child; read-only |
| State | Data inside a component that can change |
| `useState` | Hook for creating state |
| `useEffect` | Side effects (timers, fetches, etc.) — learn later |
| Re-render | When state/props change, React updates the DOM |

---

## 11. How Does This Work with Three.js? (Preview)

The project backlog mentions "React + Three.js". A common split:

1. **React handles UI** (buttons, panels, data)
2. **Three.js handles the 3D canvas** (city models, camera)
3. Use **`@react-three/fiber`** to write Three.js inside React (a future tutorial topic)

For now: **master React basics first**, then add 3D.

---

## 12. Recommended Exercises

Work through these in order:

1. Change the title in `App.jsx` to your project name
2. Build a counter component (`useState`)
3. Build a district list with click-to-select highlighting
4. Add "raise rent" and "protest" buttons that update state
5. Split components into separate files (e.g. `DistrictCard.jsx`)

---

## 13. Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Blank screen | Check the browser console (F12) for errors |
| Changes not showing | Did you update state with `setXxx`? |
| List warnings | Did each item have a `key`? |
| Port in use | Use a different port or stop other dev servers |

Official docs: [https://react.dev/learn](https://react.dev/learn)

---

## 14. Building for Production and the "chunk size" Warning

`npm run dev` starts a dev server for local editing. `npm run build` packs everything into static files under `dist/`, ready to upload to a web host.

Run it from the folder that contains `package.json` (in this repo that is `my-first-react/`, not `dd699/`):

```bash
cd my-first-react
npm run build
```

### What the warning says

```
dist/assets/index-XXXX.js   1,092.83 kB │ gzip: 300.05 kB

(!) Some chunks are larger than 500 kB after minification.
```

### What it means, in plain words

Vite bundles all your code plus every library you imported into one big JavaScript file (a "chunk"). Vite prints a **warning** — not an error — whenever a chunk is over 500 kB, because the browser must download that whole file before the page can show anything. On a slow phone connection, a big first file means a longer blank screen.

The build **succeeded**. Nothing is broken.

### Why this project's bundle is big

The size comes almost entirely from libraries, not from our own code:

| What | Roughly |
|------|---------|
| `three` (the whole 3D engine: math, geometry, materials, WebGL renderer) | most of it |
| `@react-three/fiber` + `@react-three/drei` (helpers such as `OrbitControls`) | some |
| `react` + `react-dom` | ~130 kB |
| Our own `App.jsx` and components | tiny |

So the honest one-line reason: **we import Three.js, and Three.js is a large library that all lands in the single default chunk.**

Also note the two numbers: `1,092.83 kB` is the file on disk, `gzip: 300.05 kB` is what actually travels over the network, since servers compress it. 500 kB is Vite's default threshold, and 300 kB gzipped is a normal size for a 3D app.

### Do we need to fix it?

For a course project served locally or on a fast connection — no. Ignore it.

If you want it gone later, in rough order of effort:

1. **Lazy-load the 3D scene** so the panel UI appears first and Three.js downloads afterwards:

   ```jsx
   import { lazy, Suspense } from "react";

   const CityScene = lazy(() => import("./CityScene.jsx"));

   function App() {
     return (
       <Suspense fallback={<p>Loading 3D scene…</p>}>
         <CityScene />
       </Suspense>
     );
   }
   ```

   `import()` tells Vite to put `CityScene` and Three.js in a **separate** chunk, loaded on demand.

2. **Import only what you use.** Write `import { Mesh } from "three"` rather than pulling in extra `three/examples/...` modules you do not need.

3. **Just raise the threshold** if you have decided the size is acceptable and only want the message to stop — in `vite.config.js`:

   ```js
   export default defineConfig({
     build: { chunkSizeWarningLimit: 1200 },
   });
   ```

   This silences the warning without changing the bundle, so use it only as a deliberate choice.

---

## Next Steps

- Learn `useEffect` (simulation ticks, timed city updates)
- Learn file structure and splitting components
- Integrate Three.js / React Three Fiber
- Implement "player selects district + displays data" from `docs/planning/backlog.md`
