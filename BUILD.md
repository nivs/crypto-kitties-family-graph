# CryptoKitties Family Graph - 3D Build Setup

The 3D viewer uses a local build process to bundle Three.js dependencies properly.

## Setup

Install dependencies:
```bash
npm install
```

## Development

Run development server:
```bash
npm run dev
```

This will open the 3D viewer at `http://localhost:5173/3d.html`

## Production Build

Build for production:
```bash
npm run build
```

This will bundle `ck-family-graph-3d.js` and output it to `dist/js/3d.js`

## Notes

- The 2D viewer (`index.html`) doesn't require building - it works as-is
- Only the 3D viewer needs the build step due to Three.js and ViewportGizmo dependencies
- The source file `dist/js/ck-family-graph-3d.js` is tracked in git
- The built output `dist/js/3d.js` is gitignored and generated during build
