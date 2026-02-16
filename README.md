# CryptoKitties Family Graph

An interactive family graph visualizer for [CryptoKitties](https://www.cryptokitties.co/). Explore breeding relationships, discover mewtation gems, and visualize your kitty lineage.

[![Screenshot](images/screenshot.png)](https://ck.innerlogics.com/?kitties=896775,1,4,18,100000,174756,275808,500000)

**[Try the live demo →](https://ck.innerlogics.com/?kitties=896775,1,4,18,100000,174756,275808,500000)**

## Viewers

### 2D Viewer (Primary)

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

### 3D Viewer

**[→ Full 3D Documentation](docs/3D_VIEWER.md)**

3D visualization layer using WebGL and Three.js:

- **3D Force-Directed Graph**: Nodes in 3D space with physics simulation
- **Z-Axis Modes**: Generation, birthday, rarity (mewtation position), or flat
- **3D Gem Indicators**: Realistic materials with transparency, reflectivity, and clearcoat
- **Interactive Camera**: Orbit controls + viewport gizmo for quick navigation
- **Filter Highlighting**: Emissive glow for matching nodes, darkening for dimmed nodes
- **Embed Support**: Fullscreen mode with floating panel and 2D/3D switcher
- **Smart Defaults**: Auto-recommends Z-axis mode based on dataset analysis

**Recommendation**: Use 2D viewer for large graphs, 3D for exploration and presentations.

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
   - Entering kitty ID(s) in the textbox (try `896775` for the most expensive kitty)
   - Loading a JSON file from the `examples/` folder
   - Using [query parameters](docs/QUERY_PARAMETERS.md) (e.g., `?kitties=1,4,18` for origin story)

## Documentation

**[→ Query Parameters Reference](docs/QUERY_PARAMETERS.md)** - Complete guide to URL parameters for data loading, filtering, viewport control, and more

**[→ Embedding Guide](docs/EMBEDDING.md)** - How to embed the graph in other pages with iframe examples and best practices

**[→ 3D Viewer](docs/3D_VIEWER.md)** - Full documentation for the 3D visualization layer

**[→ Notable Kitties](docs/NOTABLE_KITTIES.md)** - Catalog of historically significant and expensive CryptoKitties

**[→ Tools](tools/README.md)** - Scripts for fetching kitty data, downloading images, and analyzing genetics

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

Use the tools in `tools/` to fetch kitty data and download images:

```bash
cd tools
python3 ck_fetch.py --ids "124653,129868" --parents 2 --children 1 --out my_kitties.json
python3 download_svgs.py my_kitties.json -o ./svg/ --skip-existing
```

Then load with: `?dataUrl=./my_kitties.json`

See **[tools/README.md](tools/README.md)** for complete documentation of all available tools (data fetching, genetic analysis, fancy detection, rare trait search, and more).

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
- [Dragon](https://ck.innerlogics.com/?dataUrl=./examples/dragon/dragon_extended.json&selected=896775&zAxis=rarity&cam3d=-208.3_480.1_58.1_-0.0975_0.6487_0.7490_-0.0930_1.00) - 600 ETH (~$170k)
- [Founders](https://ck.innerlogics.com/?dataUrl=./examples/founders/founders_children.json&genMax=0&zAxis=rarity&cam2d=0.692_-6.6_-35.8&cam3d=13.4_538.8_70.3_-0.0975_0.6487_0.7490_-0.0930_1.00) - Founder Core Set
- [Milestones](https://ck.innerlogics.com/?dataUrl=./examples/milestones/milestones.json&zAxis=rarity&cam2d=1.195_28.9_-181.5&cam3d=28.9_285.2_44.9_-0.0975_0.6487_0.7490_-0.0930_1.00) - #100k & #500k
- [Holidays](https://ck.innerlogics.com/?dataUrl=./examples/holidays/holidays.json&zAxis=rarity&cam2d=1.887_37.9_-186.4&cam3d=37.9_208.9_33.3_-0.0975_0.6487_0.7490_-0.0930_1.00) - Mistletoe & SantaClaws

**Special Cats:**
- [Fancies](https://ck.innerlogics.com/?dataUrl=./examples/fancies/fancies.json&zAxis=generation&cam2d=0.657_17.1_-66.1&cam3d=17.1_305.4_23.8_-0.0975_0.6487_0.7490_-0.0930_1.00) - 42 bred from specific trait recipes
- [Purrstiges](https://ck.innerlogics.com/?dataUrl=./examples/purrstiges/purrstiges.json&zAxis=generation&cam2d=0.864_12.7_-41.4&cam3d=12.7_259.1_34.5_-0.0975_0.6487_0.7490_-0.0930_1.00) - 59 time-limited breeding events
- [Exclusives](https://ck.innerlogics.com/?dataUrl=./examples/exclusives/exclusives.json&zAxis=generation&cam2d=0.100_0.6_-1.8&cam3d=0.6_213301.2_57.2_-0.0975_0.6487_0.7490_-0.0930_1.00) - 317 celebrity and promotional cats

**Rare Mewtations:**
- [Tier III](https://ck.innerlogics.com/?dataUrl=./examples/tier_iii/tier_iii.json&mewtations=diamond,gold&filterEdgeHighlight=true&zAxis=rarity&cam2d=0.314_-6.8_-1.5&cam3d=-6.8_612.5_52.1_-0.0975_0.6487_0.7490_-0.0930_1.00) - Very rare mewtations
- [Tier IIII](https://ck.innerlogics.com/?dataUrl=./examples/tier_iiii/tier_iiii.json&mewtations=diamond&filterEdgeHighlight=true&zAxis=rarity&cam2d=0.250_-1.6_-4.2&cam3d=-1.6_1104.2_60.7_-0.0975_0.6487_0.7490_-0.0930_1.00) - Rarest mewtations
- [Diamonds](https://ck.innerlogics.com/?dataUrl=./examples/diamonds/diamonds.json&mewtations=all&filterEdgeHighlight=true&zAxis=rarity&cam2d=0.100_-7.8_-5.9&cam3d=-7.8_5385.6_58.7_-0.0975_0.6487_0.7490_-0.0930_1.00) - First discoverers of mewtation traits
- [Gen-0 Diamonds](https://ck.innerlogics.com/?dataUrl=./examples/gen0_diamonds/gen0_diamonds.json&mewtations=diamond&filterEdgeHighlight=true&zAxis=rarity&cam2d=0.518_14.3_-73.5&cam3d=14.3_297.2_48.1_-0.0975_0.6487_0.7490_-0.0930_1.00) - 40 trait discoverers

**Shortest Paths:**
- [Holiday Fancies Path](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/holiday_fancies.json&pathFrom=174756&pathTo=275808&zAxis=rarity&cam2d=0.100_1.5_-4.6&cam3d=1.5_6845.3_63.2_-0.0975_0.6487_0.7490_-0.0930_1.00) - Mistletoe → Santa
- [Dragon Path](https://ck.innerlogics.com/?dataUrl=./examples/dragon/dragon_connected.json&selected=896775&shortestPath=true&zAxis=rarity&cam3d=6.6_311.1_45.0_-0.0975_0.6487_0.7490_-0.0930_1.00) - Hover for paths

**3D Examples:**
- [Dragon 3D](https://ck.innerlogics.com/3d.html?dataUrl=./examples/dragon/dragon_extended.json&selected=896775&zAxis=rarity&cam3d=-208.3_480.1_58.1_-0.0975_0.6487_0.7490_-0.0930_1.00) - 600 ETH kitty in 3D
- [Founders 3D](https://ck.innerlogics.com/3d.html?dataUrl=./examples/founders/founders_children.json&genMax=0&zAxis=rarity&cam2d=0.692_-6.6_-35.8&cam3d=13.4_538.8_70.3_-0.0975_0.6487_0.7490_-0.0930_1.00) - Origin cats in 3D
- [Diamonds 3D](https://ck.innerlogics.com/3d.html?dataUrl=./examples/diamonds/diamonds.json&mewtations=all&filterEdgeHighlight=true&zAxis=rarity&cam2d=0.100_-7.8_-5.9&cam3d=-7.8_5385.6_58.7_-0.0975_0.6487_0.7490_-0.0930_1.00) - First discoverers with gem filtering
- [Tier IIII 3D](https://ck.innerlogics.com/3d.html?dataUrl=./examples/tier_iiii/tier_iiii.json&mewtations=diamond&filterEdgeHighlight=true&zAxis=rarity&cam2d=0.250_-1.6_-4.2&cam3d=-1.6_1104.2_60.7_-0.0975_0.6487_0.7490_-0.0930_1.00) - Rarest mewtations

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
- [vis-network](https://visjs.github.io/vis-network/docs/network/) for the 2D graph library
- [3d-force-graph](https://github.com/vasturiano/3d-force-graph) by Vasco Asturiano for the 3D graph library
- [Three.js](https://threejs.org/) for WebGL 3D rendering
- [three-viewport-gizmo](https://github.com/Fennec-hub/three-viewport-gizmo) by Fennec Hub for the camera navigation widget
- [Claude Code](https://claude.ai/code) by Anthropic for AI-assisted development

