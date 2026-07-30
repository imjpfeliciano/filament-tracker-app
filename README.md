# Filament Tracker

A personal, browser-only tool for tracking 3D-printing filament brands and colors (with hex), then sharing a read-only color sheet via a single self-contained link.

## Features

- Add, edit, delete filaments (brand, type, variant, optional color name, hex, available flag)
- Persist inventory in `localStorage` (no accounts, no backend)
- Export / import the full inventory as a JSON file (move between computers)
- Copy a share link that embeds available colors in a compressed binary URL hash
- Viewers open `/s#...` and see the same available sheet — no access to your local data

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy (Vercel)

`vercel.json` rewrites app routes like `/s` to `index.html` so shared links work on direct open / refresh (not only in-app navigation).

## Notes

- Share links are snapshots. If you change inventory later, copy a new link.
- Clearing site data or using another browser starts with an empty inventory.
