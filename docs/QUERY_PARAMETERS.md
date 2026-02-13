# Query Parameters

Complete reference for URL parameters supported by both 2D and 3D viewers.

## Graph Data

| Parameter | Description | Example |
|-----------|-------------|---------|
| `kitty` or `kitties` | Comma-separated kitty IDs to load from API | `?kitties=124653,129868` |
| `dataUrl` | URL to a JSON file with kitty data | `?dataUrl=./my_kitties.json` |
| `noExpand` | Skip embedded parent/child extraction (faster, exact IDs only) | `?noExpand=true` |

## Viewport (2D Viewer)

| Parameter | Description | Example |
|-----------|-------------|---------|
| `zoom` | Zoom level (scale factor) | `?zoom=1.500` |
| `viewX` | Horizontal center position (canvas x-coordinate) | `?viewX=150.5` |
| `viewY` | Vertical center position (canvas y-coordinate) | `?viewY=-200.3` |

**Automatically included in permalinks.** When generating embed code, use "Preserve viewport" checkbox to include these.

## Viewport (3D Viewer)

| Parameter | Description | Example |
|-----------|-------------|---------|
| `cameraX` | Camera x-position (3D space) | `?cameraX=250.0` |
| `cameraY` | Camera y-position (3D space) | `?cameraY=300.0` |
| `cameraZ` | Camera z-position (3D space) | `?cameraZ=400.0` |

**Automatically included in permalinks.** When generating embed code, use "Preserve viewport" checkbox to include these.

## Display Options

| Parameter | Description | Example |
|-----------|-------------|---------|
| `embed` | Enable embed mode (full viewport, floating panel) | `?embed=true` |
| `switcher` | Show/hide 2D↔3D switcher in embed mode (default: shown) | `?switcher=false` |
| `svgBaseUrl` | Base URL for local SVG images | `?svgBaseUrl=./svg/` |
| `layout` | Graph layout (2D only): `clustered`, `physics`, `barnesHut`, `repulsion`, `circle`, `hierarchicalUD`, `hierarchicalDU`, `hierarchicalLR` | `?layout=circle` |

## Selection & Navigation

| Parameter | Description | Example |
|-----------|-------------|---------|
| `selected` | Pre-select a kitty (shows details, centers view) | `?selected=896775` |
| `shortestPath` | Enable shortest path mode (use with `selected`) | `?shortestPath=true` |
| `pathFrom` | Shortest path: source kitty ID | `?pathFrom=174756` |
| `pathTo` | Shortest path: target kitty ID | `?pathTo=275808` |

## Filters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `genMin` | Minimum generation (inclusive) | `?genMin=0` |
| `genMax` | Maximum generation (inclusive) | `?genMax=10` |
| `mewtations` | Mewtation gems: `all` or comma-separated: `diamond`, `gold`, `silver`, `bronze` | `?mewtations=diamond,gold` |
| `filterEdgeHighlight` | Highlight edges between filtered kitties | `?filterEdgeHighlight=true` |
| `owner` | Pin owner highlight (address or nickname) | `?owner=0x1234...` or `?owner=nivs` |

## 3D Viewer Only

| Parameter | Description | Example |
|-----------|-------------|---------|
| `zAxis` | Z-axis mode: `generation`, `birthday`, `rarity`, `flat` | `?zAxis=rarity` |

## Examples

### Basic Loading
```
# Load specific kitties from API
?kitties=124653,129868,148439

# Load from local JSON
?dataUrl=./examples/nivs/nivs.json

# Load without expanding parents/children
?kitties=124653,129868&noExpand=true
```

### With Viewport
```
# 2D with custom zoom and position
?kitties=896775&zoom=1.500&viewX=150.5&viewY=-200.3

# 3D with custom camera position
?kitties=896775&cameraX=250.0&cameraY=300.0&cameraZ=400.0
```

### Embed Mode
```
# Basic embed
?embed=true&kitties=124653,129868

# Embed without 2D/3D switcher
?embed=true&kitties=124653,129868&switcher=false

# Embed with preserved viewport (2D)
?embed=true&kitties=124653&zoom=1.5&viewX=100&viewY=-50
```

### With Filters
```
# Generation range
?kitties=896775&genMin=0&genMax=5

# Mewtation gems
?kitties=896775&mewtations=diamond,gold

# Combined filters with owner highlight
?kitties=896775&genMin=0&genMax=5&mewtations=gold&owner=nivs

# Filter with edge highlighting
?dataUrl=./examples/tier_iii/tier_iii.json&mewtations=diamond,gold&filterEdgeHighlight=true
```

### Shortest Path
```
# Show path between two kitties
?dataUrl=./examples/shortest_path/holiday_fancies.json&pathFrom=174756&pathTo=275808

# Enable path mode (hover to see paths from selected)
?dataUrl=./examples/dragon/dragon_connected.json&selected=896775&shortestPath=true
```

### 3D Viewer
```
# With Z-axis mode
?kitties=896775&zAxis=rarity

# Full 3D setup with filters and camera position
?kitties=896775&zAxis=rarity&mewtations=diamond&cameraX=250&cameraY=300&cameraZ=400
```

## Parameter Interaction

### Viewport + Selection
When both viewport and selection parameters are present:
- **2D**: Viewport is applied after selection (800ms delay)
- **3D**: Camera position overrides auto-center on selection

### Filters + Shortest Path
Filters and shortest path work independently:
- Filters affect node/edge highlighting
- Shortest path highlights the connection between two nodes
- Both can be active simultaneously

### Embed Mode
- Hides header and sidebar
- Shows floating panel for selected kitty details
- Switcher button can be hidden with `?switcher=false`
- All other parameters work in embed mode
