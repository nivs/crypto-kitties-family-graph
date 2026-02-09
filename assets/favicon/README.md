# Favicon Source Files

Source PNG files for generating favicons. These are not deployed.

## Files

| File | Size | Purpose |
|------|------|---------|
| `favicon-full.png` | 1024x1024 | Original source image |
| `favicon-512.png` | 512x512 | PWA icon (large) |
| `favicon-192.png` | 192x192 | PWA icon (standard) |
| `favicon-180.png` | 180x180 | Apple touch icon |
| `favicon-64.png` | 64x64 | ICO component |
| `favicon-48.png` | 48x48 | ICO component |
| `favicon-32.png` | 32x32 | Browser tab icon |
| `favicon-16.png` | 16x16 | ICO component |
| `favicon.ico` | Multi | Combined ICO file |

## Generating favicon.ico

Requires ImageMagick:

```bash
# macOS
brew install imagemagick

# Linux
sudo apt install imagemagick
```

Generate multi-resolution ICO:

```bash
magick favicon-16.png favicon-32.png favicon-48.png favicon-64.png favicon.ico
```

Verify:

```bash
identify favicon.ico
# favicon.ico[0] ICO 16x16 ...
# favicon.ico[1] ICO 32x32 ...
# favicon.ico[2] ICO 48x48 ...
# favicon.ico[3] ICO 64x64 ...
```

## Deployed Files

Copy these to `dist/`:
- `favicon.ico`
- `favicon-32.png`
- `favicon-192.png`
- `favicon-512.png`
- `favicon-180.png` → `apple-touch-icon.png`
