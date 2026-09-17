# Procedural World Building Learning Site

Interactive course website built with React, Vite, React Three Fiber, and Drei.

## Run the website

Open PowerShell in this folder:

```powershell
cd "E:\Cornell\26fall\procedural world building\dd699\worldbuilding-guidebook"
```

Install dependencies once after cloning the repository or when `node_modules` is missing:

```powershell
npm.cmd install
```

Start the local development server:

```powershell
npm.cmd run dev
```

Vite will print a local address, usually `http://localhost:5173/`. Open that address in a browser. While the server is running, saved changes update the page automatically.

Press `Ctrl+C` in the PowerShell window to stop the server.

> In some PowerShell setups, `npm` is blocked because it tries to run `npm.ps1`. Use `npm.cmd` as shown above; it runs the same npm commands without that PowerShell policy issue.

## Check and build

Run the linter:

```powershell
npm.cmd run lint
```

Create a production build:

```powershell
npm.cmd run build
```

Preview the production build locally:

```powershell
npm.cmd run preview
```

## Lessons

The site currently includes Lesson 01 — Scene Anatomy and Lesson 02 — Creating Procedural Maps. Lesson 02 is divided into 2.1 Functions and 2.2 Simulation. Use the lesson navigation at the top of the page to switch lessons without reloading.
