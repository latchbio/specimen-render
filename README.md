# Specimen Render

Specimen Render is an interactive atlas for making biological structure visible: realtime Three.js specimen studies, print-style dithering, image reliefs, and export-ready render experiments.

The project opens on a visual index that maps the current work. The main display and detail lab share the same specimen cabinet, lighting system, LOD assets, and export tools.

## Requirements

- Node.js 18+

## Setup

```bash
npm install
```

## Develop

Start the Vite dev server:

```bash
npm run dev
```

Then open:

- Starting page: [http://localhost:5173/](http://localhost:5173/)
- Specimen display: [http://localhost:5173/display.html](http://localhost:5173/display.html)
- Detail lab: [http://localhost:5173/detail-lab.html](http://localhost:5173/detail-lab.html)
- Image relief: [http://localhost:5173/image-relief.html](http://localhost:5173/image-relief.html)
- Botanical dither: [http://localhost:5173/flower-dither.html](http://localhost:5173/flower-dither.html)
- Petri relief: [http://localhost:5173/face.html](http://localhost:5173/face.html)

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local development server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run build:standalone` | Build a single self-contained HTML file with embedded models |

Standalone output:

```text
dist/bacteriophage-standalone.html
```

## Notes

- Specimen OBJ assets and LOD variants live in `public/models/`
- The starting page is a static index at `index.html`, styled by `src/landing.css`
- The specimen display supports nine models, orbit controls, automatic LOD, calibrated lighting, PNG export, banner export, detailed banner export, and an 8-second looping rotation export
- The detail lab exposes ten alternate rendering methods, including frequency modulation, blue noise, contour lines, rounded pixels, GTAO, and region annotations
- Image relief and botanical dither are separate experiments built from the same visual language
- Prefer reduced-motion OS settings if you want auto-rotation disabled
