# 3D Viewer (Proof of Concept)

**Status:** Proof of Concept - Experimental 3D visualization layer

The 3D viewer provides an alternative way to explore CryptoKitties family graphs in three-dimensional space using WebGL.

## Features

### Visualization
- **3D Force-Directed Graph**: Nodes and edges rendered in 3D space with physics simulation
- **Textured Spheres**: Kitty images mapped onto 3D spheres with proper lighting
- **Physical Materials**: MeshPhysicalMaterial and MeshStandardMaterial for realistic shading
- **Interactive Camera**: Orbit controls for pan, zoom, and rotate
- **Viewport Gizmo**: Bottom-left navigation widget for quick camera orientation

### Z-Axis Modes

The Z-axis provides a third dimension for data visualization:

| Mode | Description | Best For |
|------|-------------|----------|
| **Generation** | Older generations higher | Family trees with <100 generation range |
| **Birthday** | Older kitties higher | Time-based analysis or tight generation ranges |
| **Rarity** | Rarer kitties higher (by mewtation position 1-500) | Mewtation-focused datasets (Tier III/IIII, diamonds) |
| **Flat** | No Z variance | 2D-like layout in 3D space |

**Smart Normalization**: All modes automatically normalize based on actual data ranges to prevent excessive spread.

**Dynamic Scaling**: `maxZSpread` adjusts based on dataset size:
- Small (<50 kitties): 600 units
- Medium (50-500): 800 units
- Large (>500): 1000 units

### Mewtation Gems

3D gems float above kitties with mewtations:

| Gem | Shape | Material | Discovery Position |
|-----|-------|----------|-------------------|
| **Diamond** | Octahedron | Transparent crystal (IOR 2.4) | 1st |
| **Gold** | Icosahedron | Metallic | 2-10 |
| **Silver** | Tetrahedron | Metallic bright | 11-100 |
| **Bronze** | Dodecahedron | Metallic dull | 101-500 |

Materials use `MeshPhysicalMaterial` with:
- Diamond: 40% opacity, zero roughness, clearcoat, diamond index of refraction
- Metals: High reflectivity, clearcoat, appropriate roughness

### Filtering & Highlighting

**Filter Types:**
- Generation range (min/max)
- Mewtation gems (diamond/gold/silver/bronze, or all)
- Shortest path mode

**Visual Effects:**
- Highlighted nodes: Emissive glow (25% intensity) in their kitty color
- Dimmed nodes: Gray tint (0x555555) for non-matching kitties
- Full opacity maintained for better visibility

### Selection & Navigation

- **Click**: Select kitty (shows details panel, focuses camera)
- **Hover**: Show tooltip with kitty info
- **Shortest Path**: Hover between kitties to highlight path
- **Camera Focus**: Auto-centers on selected kitty with smooth animation

### Controls

**Collapsible Panels:**
- Selected Kitty (auto-expands on selection)
- Z-Axis mode selector
- Filters (generation, mewtations, path mode)
- Settings (pre-fetch, auto-connect)
- Examples (quick-load preset datasets)

**Buttons:**
- Clear Filters: Reset all active filters
- 2D/3D Switcher: Toggle between views (preserves URL params)

## Embed Mode

Add `?embed=true` to URL for fullscreen embed mode:

**Features:**
- Hides header and side panels
- Shows floating draggable panel for selected kitty
- 2D/3D switcher in panel header
- Optional viewport preservation (camera position)

**Switcher Control:**
- `?switcher=false` or `?switcher=0`: Hides the 2D/3D button

**Viewport Preservation:**
- Use the "Preserve viewport" checkbox in the embed modal to include current camera position
- Camera parameters (`cameraX`, `cameraY`, `cameraZ`) will be added to the embed URL
- Useful for showcasing specific views or details in the graph

**Example:**
```
https://yoursite.com/3d.html?dataUrl=./examples/dragon.json&embed=true&switcher=true&cameraX=250.0&cameraY=300.0&cameraZ=400.0
```

See **[EMBEDDING.md](EMBEDDING.md)** for complete embedding guide with examples and best practices.

## URL Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `dataUrl` | URL | JSON file to load |
| `kitties` or `kitty` | IDs | Comma-separated kitty IDs to load from API |
| `selected` | ID | Pre-select kitty by ID |
| `zAxis` | generation\|birthday\|rarity\|flat | Z-axis mode |
| `cameraX` | number | Camera X position (3D space) |
| `cameraY` | number | Camera Y position (3D space) |
| `cameraZ` | number | Camera Z position (3D space) |
| `genMin` | number | Minimum generation filter |
| `genMax` | number | Maximum generation filter |
| `mewtations` | all\|diamond,gold,silver,bronze | Mewtation filter (comma-separated) |
| `filterEdgeHighlight` | true\|false | Highlight edges between filtered kitties |
| `shortestPath` | true\|false | Enable shortest path mode |
| `pathFrom` | ID | Start of path |
| `pathTo` | ID | End of path |
| `embed` | true\|false | Enable embed mode |
| `switcher` | true\|false | Show/hide 2D/3D switcher (embed mode) |
| `examples` | open | Auto-open examples panel |

**Viewport Preservation:**
- Camera position (`cameraX`, `cameraY`, `cameraZ`) is automatically included in all permalinks
- When generating embed code, use the "Preserve viewport" checkbox to include camera position
- On page load, camera position parameters override auto-centering on selected nodes

**Example with filters and viewport:**
```
3d.html?dataUrl=./examples/tier_iiii.json&mewtations=diamond&zAxis=rarity&cameraX=250.0&cameraY=300.0&cameraZ=400.0
```

For complete parameter documentation including 2D viewer parameters, see **[QUERY_PARAMETERS.md](QUERY_PARAMETERS.md)**.

## Technical Details

### Dependencies

- **3d-force-graph** v1.73.3: 3D force-directed graph layout
- **Three.js** v0.160.0: WebGL 3D rendering
- **three-viewport-gizmo** v2.2.0: Camera navigation widget

### Architecture

**Import Map**: Resolves Three.js module imports for ViewportGizmo compatibility:
```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>
```

**Separate Render Loops:**
- Main graph: Managed by 3d-force-graph
- Viewport gizmo: Separate requestAnimationFrame loop

**Node Rendering:**
```javascript
// Create textured sphere with kitty image
const geometry = new THREE.SphereGeometry(16, 32, 32);
const texture = loadKittyTexture(imageUrl, backgroundColor);
const material = new THREE.MeshStandardMaterial({
  map: texture,
  metalness: 0.3,
  roughness: 0.7
});
```

**Lighting:**
- Ambient: 0.4 intensity (base illumination)
- Directional: 0.8 intensity from (200, 500, 300)
- Directional 2: 0.4 intensity from (-200, -500, -300)

### Styling

**Frosted Glass Panels:**
- `background: rgba(18, 22, 34, 0.75)`
- `backdrop-filter: blur(16px)`
- `border: 1px solid rgba(255, 255, 255, 0.10)`

**Viewport Gizmo Background:**
- Semi-transparent (75% opacity)
- Hover darkening (85% opacity)
- Positioned bottom-left

## Analysis Tool

The `analyze_datasets.py` tool (in `/tools`) recommends optimal Z-axis settings:

```bash
python3 tools/analyze_datasets.py dist/examples
```

**Output:**
```
📁 tier_iiii/tier_iiii.json
   Kitties: 158
   Generation: 1-4848 (range: 4848, unique: 20)
   Mewtations: 380 gems (pos: 1-499)
   ✨ Recommended Z-axis: rarity
      Reason: Wide generation range with mewtations
      Parameters: maxZSpread=800
      URL param: ?zAxis=rarity
```

See `tools/README.md` for detailed algorithm explanation.

## Performance Considerations

### Optimizations
- No individual point lights on nodes (too expensive)
- Emissive materials for glow effects instead
- Texture caching for kitty images
- Single material per node type

### Known Limitations
- Large datasets (>1000 nodes) may impact frame rate
- Initial physics simulation can be computationally intensive
- Memory usage scales with node count and texture resolution

### Recommendations
- Use dataset pruning tools (`filter_connected.py`, `prune_json.py`) for large graphs
- Disable physics after initial layout stabilizes
- Consider using the 2D viewer for very large datasets

## Future Enhancements

**Potential improvements** (currently not implemented):

- VR/AR support
- Stereoscopic rendering
- Particle effects for mewtation discovery
- Time-based animation (replay breeding history)
- Network graph layout algorithms beyond force-directed
- Node clustering/LOD for large datasets
- Export to glTF/USD for external 3D tools

## Comparison: 2D vs 3D

| Feature | 2D Viewer | 3D Viewer |
|---------|-----------|-----------|
| Performance | Better (Canvas 2D) | Good (WebGL) |
| Navigation | Pan/zoom | Orbit/pan/zoom/rotate |
| Data density | Higher | Lower (3D space) |
| Visual encoding | X/Y position, color | X/Y/Z position, color, 3D objects |
| Best for | Large graphs, detailed analysis | Exploration, presentations |
| Mobile support | Excellent | Good |

**Recommendation**: Use 2D viewer for primary analysis, 3D viewer for exploration and demonstration.

## Credits

- **3d-force-graph**: Vasco Asturiano
- **Three.js**: Ricardo Cabello (mrdoob) and contributors
- **three-viewport-gizmo**: Fennec Hub

## License

This viewer is part of the CryptoKitties Family Graph project. See main LICENSE file.
