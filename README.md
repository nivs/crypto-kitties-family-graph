# CryptoKitties Family Graph

An interactive family tree visualizer for [CryptoKitties](https://www.cryptokitties.co/). Explore breeding relationships, discover mewtation gems, and visualize your kitty lineage.

![Screenshot](images/screenshot.png)

## Features

- **Interactive Graph**: Physics-based layout with drag, zoom, and pan
- **Family Visualization**: Pink edges for matron (mother), blue edges for sire (father)
- **Mewtation Gems**: Diamond, Gold, Silver, and Bronze gem badges for trait discoverers
- **Owner Highlighting**: Hover over owner names to highlight all their kitties
- **Smart Merging**: Loading connected kitties merges into existing graph
- **Local SVG Support**: Use locally cached SVG images for faster loading
- **Live API**: Fetch kitty data directly from CryptoKitties API

## Quick Start

1. Start a local server:
   ```bash
   python3 -m http.server 8001
   ```

2. Open in browser:
   ```
   http://localhost:8001/
   ```

3. Load kitties by:
   - Entering kitty ID(s) in the textbox
   - Loading a JSON file
   - Using query parameters (see below)

## Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `kitty` or `kitties` | Comma-separated kitty IDs to load from API | `?kitties=124653,129868` |
| `dataUrl` | URL to a JSON file with kitty data | `?dataUrl=./my_kitties.json` |
| `svgBaseUrl` | Base URL for local SVG images | `?svgBaseUrl=./svg/` |

**Examples:**
```
# Load specific kitties from API
http://localhost:8001/?kitties=124653,129868,148439

# Load from local JSON with local SVGs
http://localhost:8001/?dataUrl=./nivs/nivs_kitties.json&svgBaseUrl=./nivs/svg/
```

## Configuration

Edit `CK_GRAPH_DEFAULTS` in `index.html`:

```javascript
window.CK_GRAPH_DEFAULTS = {
  debugLevel: 0,              // 0=off, 1=info, 2=verbose
  useProxy: false,            // Enable CORS proxy for API calls
  proxyUrl: "",               // Your proxy URL (see proxy/ckproxy.php)
  svgBaseUrl: "",             // Base URL for local SVG files
  svgProbe: "on",             // "on" to try local SVGs first
  svgFromApi: true,           // Load images from API (fallback if local not found)
  siteBaseUrl: "https://www.cryptokitties.co",
  dataUrl: ""                 // Default JSON to load on startup
};
```

## Project Structure

```
crypto-kitties-family-graph/
├── index.html          # Main HTML page
├── ck-family-graph.js  # Graph visualization logic
├── images/             # Mewtation gem images
├── proxy/              # CORS proxy for hosting on your server
│   └── ckproxy.php     # PHP proxy script
└── scripts/            # Data generation tools
    └── ck_fetch.py     # Fetch kitty data from API
```

## Generating Kitty Data

Use `scripts/ck_fetch.py` to generate a JSON file with your kitties:

```bash
# Install dependencies
pip install requests

# Fetch kitties with their parents and children
python3 scripts/ck_fetch.py \
  --ids "124653,129868,148439" \
  --parents 2 \
  --children 1 \
  --out my_kitties.json \
  -v
```

See `python3 scripts/ck_fetch.py --help` for all options.

## CORS Proxy

When hosting on a web server, you may need the CORS proxy for API calls. Deploy `proxy/ckproxy.php` to your PHP-enabled server and configure `proxyUrl` in the defaults.

## Interactions

- **Click** a kitty to see details in the sidebar
- **Double-click** to expand family (fetch parents and children)
- **Hover** over a kitty to highlight family connections
- **Hover** over owner name to highlight all their kitties
- **Drag** nodes to rearrange
- **Toggle Physics** to freeze/unfreeze the layout

## License

MIT License - see [LICENSE](LICENSE)

## Credits

- [CryptoKitties](https://www.cryptokitties.co/) for the awesome game and API
- [vis-network](https://visjs.github.io/vis-network/docs/network/) for the graph library
