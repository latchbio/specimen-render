# Specimen Render

Interactive Three.js display for biological specimen models with print-style dither and detail-lab rendering modes.

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

- Main display: [http://localhost:5173/](http://localhost:5173/)
- Detail lab: [http://localhost:5173/detail-lab.html](http://localhost:5173/detail-lab.html)

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

- Specimen OBJ assets live in `public/models/`
- The detail lab exposes lighting controls and alternate rendering methods
- Prefer reduced-motion OS settings if you want auto-rotation disabled
