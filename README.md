# ifc-reader

A browser-based IFC viewer built with Claude Code.

## What it does

Loads an [IFC](https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/) file and displays it as an interactive 3D model alongside a sidebar listing all spaces (rooms) found in the model, with their name, long name, and floor area.

Floor area is read from the IFC property sets (`IfcElementQuantity` / `IfcPropertySet`) when available. If the file does not include precomputed areas, the area is computed directly from the space geometry by summing the horizontal triangle faces.

Sample IFC files placed in `public/` appear in a dropdown on the landing screen.

## Stack

- [Vite](https://vitejs.dev/) — build tool and dev server
- [@thatopen/components](https://github.com/ThatOpenCompany/that-open-engine) v3 — IFC loading, fragment rendering
- [Three.js](https://threejs.org/) — 3D scene, camera, postproduction renderer
- [web-ifc](https://github.com/ThatOpenCompany/web-ifc) — WebAssembly IFC parser

## Usage

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, then drag and drop an IFC file onto the screen, or select one from the sample dropdown (if any `.ifc` files are present in `public/`).

## Adding sample files

Place any `.ifc` files in the `public/` directory. They will appear automatically in the sample dropdown on the landing screen without any configuration changes.
