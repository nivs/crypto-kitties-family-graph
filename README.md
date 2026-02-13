# CryptoKitties Family Graph

An interactive family graph visualizer for [CryptoKitties](https://www.cryptokitties.co/). Explore breeding relationships, discover mewtation gems, and visualize your kitty lineage.

[![Screenshot](images/screenshot.png)](https://ck.innerlogics.com/?kitties=896775,1,4,18,100000,174756,275808,500000)

**[Try the live demo →](https://ck.innerlogics.com/?kitties=896775,1,4,18,100000,174756,275808,500000)**

## Features

- **Interactive Graph**: Physics-based layout with drag, zoom, and pan
- **Family Visualization**: Pink edges for matron (mother), blue edges for sire (father)
- **Mewtation Gems**: Diamond, Gold, Silver, and Bronze gem badges for trait discoverers
- **Filters**: Filter by generation range and/or mewtation gems
- **Shortest Path**: Highlight the path between any two kitties (select one, hover another)
- **Owner Highlighting**: Hover over owner names to highlight all their kitties (pin with highlight button or `?owner=` param)
- **Context Menu**: Right-click nodes for quick actions (expand, highlight owner, open pages, etc.)
- **Smart Expansion**: Double-click to expand family with pre-fetched accurate parent data
- **Auto-connect Discovery**: Automatically adds relatives that bridge to existing nodes when expanding
- **Smart Merging**: Loading connected kitties merges into existing graph
- **Local SVG Support**: Use locally cached SVG images for faster loading
- **Live API**: Fetch kitty data directly from CryptoKitties API
- **Embed Mode**: Embeddable graph with responsive floating panel and "Open in viewer" link

## Quick Start

1. Start a local server from the `dist` folder:
   ```bash
   cd dist && python3 -m http.server 8001
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
| `embed` | Enable embed mode (full viewport, floating panel) | `?embed=true` |
| `selected` | Pre-select a kitty (shows details, centers view) | `?selected=896775` |
| `shortestPath` | Enable shortest path mode (use with `selected`) | `?shortestPath=true` |
| `owner` | Pin owner highlight (address or nickname) | `?owner=0x1234...` or `?owner=nivs` |
| `noExpand` | Skip embedded parent/child extraction (faster, exact IDs only) | `?noExpand=true` |
| `layout` | Graph layout (`clustered`, `physics`, `barnesHut`, `repulsion`, `circle`, `hierarchicalUD`, `hierarchicalDU`, `hierarchicalLR`) | `?layout=circle` |
| `genMin` | Filter: minimum generation (inclusive) | `?genMin=0` |
| `genMax` | Filter: maximum generation (inclusive) | `?genMax=10` |
| `mewtations` | Filter: mewtation gems (`all` or comma-separated: `diamond,gold,silver,bronze`) | `?mewtations=diamond,gold` |
| `filterEdges` | Highlight edges between filtered kitties | `?filterEdges=true` |
| `pathFrom` | Shortest path: source kitty ID | `?pathFrom=174756` |
| `pathTo` | Shortest path: target kitty ID | `?pathTo=275808` |

**Examples:**
```
# Load specific kitties from API
http://localhost:8001/?kitties=124653,129868,148439

# Load from local JSON
http://localhost:8001/?dataUrl=./examples/nivs/nivs.json

# Embed mode with specific kitties
http://localhost:8001/?embed=true&kitties=124653,129868

# With filters (generation 0-5, gold mewtations, owner highlight)
http://localhost:8001/?kitties=896775&genMin=0&genMax=5&mewtations=gold&owner=nivs

# Shortest path between two kitties
http://localhost:8001/?dataUrl=./examples/shortest_path/holiday_fancies.json&pathFrom=174756&pathTo=275808
```

## Embedding

The graph can be embedded in other pages using an iframe with embed mode enabled.

**Embed mode features:**
- Full viewport graph (no header or sidebar)
- Floating panel for selected kitty details (draggable, collapsible, closable)
- Responsive compact mode for small viewports (panel and nav buttons shrink automatically)
- "Open in viewer" link to open current graph in standalone viewer
- Links to GitHub repo

**Basic iframe embed:**
```html
<iframe
  src="https://ck.innerlogics.com/?embed=true&kitties=124653,129868"
  width="100%"
  height="600"
  frameborder="0">
</iframe>
```

**Configuration for embeds:**
```javascript
window.CK_GRAPH_DEFAULTS = {
  // ... other options ...
  githubUrl: "https://github.com/nivs/crypto-kitties-family-graph"
};
```

## Configuration

Edit `CK_GRAPH_DEFAULTS` in `dist/index.html`:

```javascript
window.CK_GRAPH_DEFAULTS = {
  debugLevel: 0,              // 0=off, 1=info, 2=verbose
  useProxy: false,            // Enable CORS proxy for API calls
  proxyUrl: "",               // Your proxy URL (see proxy/ckproxy.php)
  svgBaseUrl: "",             // Base URL for local SVGs (probes automatically if set)
  svgFromApi: true,           // Load images from API (fallback if local not found)
  siteBaseUrl: "https://www.cryptokitties.co",
  dataUrl: "",                // Default JSON to load on startup
  githubUrl: "https://github.com/nivs/crypto-kitties-family-graph"
};
```

**Runtime Settings** (in the Settings panel):
- **Pre-fetch**: When enabled (default), fetches full details for embedded kitties. On initial load, this runs lazily in the background after the graph renders. On expand (double-click), fetches each child individually. Ensures accurate parent edges and complete owner data.
- **Auto-connect**: When enabled (default), expanding a kitty also discovers and adds relatives that would connect to existing nodes in the graph. This helps build more complete family trees automatically.

## Project Structure

```
crypto-kitties-family-graph/
├── dist/                       # Deploy this folder to web server
│   ├── index.html              # Main HTML page with embedded CSS
│   ├── js/
│   │   └── ck-family-graph.js  # Graph visualization logic
│   ├── images/                 # Logos, mewtation gem badges
│   └── examples/                # Pre-generated kitty data with SVGs (most expensive, fancy cats)
├── images/                     # README assets
├── assets/                     # Source assets (not deployed)
├── proxy/                      # CORS proxy (deploy separately if needed)
└── tools/                      # Dev utils (e.g. fetch kitty data from API)
```

## Generating Kitty Data

Use the tools in `tools/` to fetch kitty data and download images.

```bash
cd tools
pip install requests

# Fetch kitties with parents/children
python3 ck_fetch.py --ids "124653,129868" --parents 2 --children 1 --out my_kitties.json

# Download SVGs
python3 download_svgs.py my_kitties.json -o ./svg/ --skip-existing
```

Then load with: `?dataUrl=./my_kitties.json`

See **[tools/README.md](tools/README.md)** for full documentation including:
- `ck_fetch.py` - Fetch kitty data with ancestry/children
- `download_svgs.py` - Download kitty images
- `gene_analysis.py` - Analyze genetic inheritance and mewtations
- `genome_visualizer.py` - Create visual genome charts
- `fancy_detector.py` - Detect fancy cats and potential matches
- `find_rare_traits.py` - Search API for rare trait kitties (Tier II-IIII)

## CORS Proxy

When hosting on a web server, you may need the CORS proxy for API calls. Deploy `proxy/ckproxy.php` to your PHP-enabled server and configure `proxyUrl` in the defaults.

## Interactions

- **Click** a kitty to see details in the sidebar
- **Double-click** to expand family (fetches parents and children from API)
- **Right-click** for context menu (expand, highlight owner, open pages, copy ID, etc.)
- **Hover** over a kitty to highlight family connections (edges dim for non-family)
- **Hover** over owner name to highlight all their kitties in the graph
- **Pin** owner highlight by clicking the user icon button (persists while navigating)
- **Drag** nodes to rearrange
- **Toggle Physics** to freeze/unfreeze the layout
- **Filters** panel to filter by generation range and/or mewtation gems (AND logic when combined)

## Example Graphs

Notable kitties and curated datasets are available on [ck.innerlogics.com](https://ck.innerlogics.com).

See **[docs/NOTABLE_KITTIES.md](docs/NOTABLE_KITTIES.md)** for the complete catalog with live links.

### Live Demo Links

**Historical:**
- [Dragon](https://ck.innerlogics.com/?dataUrl=./examples/dragon/dragon_extended.json&selected=896775) - 600 ETH (~$170k) ・ [API](https://ck.innerlogics.com/?kitties=896775)
- [Founders](https://ck.innerlogics.com/?dataUrl=./examples/founders/founders.json) - Genesis + Gen 0 ・ [API](https://ck.innerlogics.com/?kitties=1,4,18)
- [Milestones](https://ck.innerlogics.com/?dataUrl=./examples/milestones/milestones.json) - #100k, #500k ・ [API](https://ck.innerlogics.com/?kitties=100000,500000)
- [Holidays](https://ck.innerlogics.com/?dataUrl=./examples/holidays/holidays.json) - Mistletoe & SantaClaws

**Rare Mewtations:**
- [Tier IIII](https://ck.innerlogics.com/?dataUrl=./examples/tier_iiii/tier_iiii.json) - Rarest traits (liger, moonrise)
- [Tier III](https://ck.innerlogics.com/?dataUrl=./examples/tier_iii/tier_iii.json) - Very rare (lykoi, avatar)
- [Diamonds](https://ck.innerlogics.com/?dataUrl=./examples/diamonds/diamonds.json&mewtations=all&filterEdges=true) - First discoverers

**Shortest Paths:**
- [Mistletoe → Santa](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/holiday_fancies.json&pathFrom=174756&pathTo=275808) - Holiday fancy connection
- [Mulberry → Dragon](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/nivs_plus_dragon.json&pathFrom=149343&pathTo=896775) - Cross-collection path

**Quick-start presets** (paste into the Kitty ID field or use as `?kitties=...`):

| Preset | IDs |
|--------|-----|
| Most expensive | `896775` |
| Origin story | `1,4,18` |
| Milestones | `100000,500000` |
| Holiday Fancies | `174756,275808` |
| All-in showcase | `896775,1,4,18,100000,174756,275808,500000` |

## Screen Recordings

[](https://github.com/user-attachments/assets/440fe402-258d-43b2-8880-b0c41b04b3fb)

[](https://github.com/user-attachments/assets/081cad80-3425-4f89-99e4-888ac96600c6)

---

## License

- MIT License - see [LICENSE](LICENSE)
- Third-Party Assets - see [LICENSE-THIRD-PARTY](LICENSE-THIRD-PARTY.md)

## Credits

- [CryptoKitties](https://www.cryptokitties.co/) for the awesome game and API
- [vis-network](https://visjs.github.io/vis-network/docs/network/) for the graph library

