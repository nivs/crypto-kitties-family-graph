# Embedding Guide

The graph can be embedded in other pages using an iframe with embed mode enabled.

## Embed Mode Features

- **Full Viewport**: Graph fills the entire iframe (no header or sidebar)
- **Floating Panel**: Selected kitty details in a draggable, collapsible panel
- **2D ↔ 3D Switcher**: Toggle between viewers (can be hidden)
- **Responsive Design**: Panel and navigation buttons adapt to small viewports
- **Viewer Links**: "Open in viewer" link to open current graph in standalone viewer
- **GitHub Link**: Link to repository

## Using the Embed Code Generator

Both viewers include an "Embed" button that opens a modal with options:

1. **Viewer**: Choose 2D or 3D
2. **Show 2D/3D switcher**: Toggle the switcher button (checked by default)
3. **Preserve viewport**: Include current zoom/camera position (unchecked by default)
4. **Width/Height**: Customize iframe dimensions (supports px or %)

The generator creates an iframe code snippet with all current state preserved (filters, selections, data).

## Basic Embed

```html
<iframe
  src="https://ck.innerlogics.com/?embed=true&kitties=124653,129868"
  width="100%"
  height="600"
  frameborder="0"
  allowfullscreen>
</iframe>
```

## Embed with Preserved Viewport

### 2D Viewer
```html
<iframe
  src="https://ck.innerlogics.com/?embed=true&kitties=896775&zoom=1.500&viewX=150.5&viewY=-200.3"
  width="800"
  height="600"
  frameborder="0"
  allowfullscreen>
</iframe>
```

### 3D Viewer
```html
<iframe
  src="https://ck.innerlogics.com/3d.html?embed=true&kitties=896775&cameraX=250.0&cameraY=300.0&cameraZ=400.0"
  width="800"
  height="600"
  frameborder="0"
  allowfullscreen>
</iframe>
```

## Embed with Filters

```html
<iframe
  src="https://ck.innerlogics.com/?embed=true&dataUrl=./examples/tier_iii/tier_iii.json&mewtations=diamond,gold&filterEdgeHighlight=true"
  width="100%"
  height="600"
  frameborder="0"
  allowfullscreen>
</iframe>
```

## Embed without Switcher

Add `&switcher=false` to hide the 2D↔3D toggle button:

```html
<iframe
  src="https://ck.innerlogics.com/?embed=true&kitties=124653&switcher=false"
  width="800"
  height="600"
  frameborder="0"
  allowfullscreen>
</iframe>
```

## Configuration for Embeds

Customize links in the floating panel by setting `CK_GRAPH_DEFAULTS` in the HTML:

```html
<script>
  window.CK_GRAPH_DEFAULTS = {
    githubUrl: "https://github.com/yourusername/your-fork",
    siteBaseUrl: "https://www.cryptokitties.co"
  };
</script>
<script src="./js/ck-family-graph.js"></script>
```

## Responsive Design

The embed automatically adapts to viewport size:
- **Desktop** (>700px): Full panel on right side
- **Mobile** (<700px): Compact panel at bottom with reduced height

For best results:
- Use `width="100%"` for responsive width
- Minimum height: 400px for mobile, 600px for desktop

## Best Practices

### Viewport Preservation
- **Enable** "Preserve viewport" when showcasing a specific view or detail
- **Disable** "Preserve viewport" to let the graph auto-fit on load

### Data Loading
- Use `?dataUrl=` for pre-generated JSON (faster, includes images)
- Use `?kitties=` for live API data (slower, requires API access)
- Use `&noExpand=true` with `?kitties=` for exact IDs only (faster)

### Performance
- Keep graphs under 1000 nodes for smooth interaction
- Use 2D viewer for large graphs (better performance)
- Use 3D viewer for exploration (proof of concept)

### Accessibility
- Always include `frameborder="0"` for clean appearance
- Add `allowfullscreen` for better UX
- Consider adding a fallback link for users with disabled iframes

## Example: Full-Featured Embed

```html
<!-- Embed with all features: 3D view, filters, preserved camera -->
<iframe
  src="https://ck.innerlogics.com/3d.html?embed=true&dataUrl=./examples/dragon/dragon_extended.json&selected=896775&zAxis=rarity&mewtations=diamond&cameraX=250.0&cameraY=300.0&cameraZ=400.0"
  width="100%"
  height="800"
  frameborder="0"
  allowfullscreen>
</iframe>

<!-- Fallback for users with disabled iframes -->
<p>
  <a href="https://ck.innerlogics.com/?dataUrl=./examples/dragon/dragon_extended.json&selected=896775" target="_blank">
    View CryptoKitties Family Graph
  </a>
</p>
```

## Troubleshooting

### Graph Not Loading
- Check that the iframe `src` URL is accessible
- Verify CORS headers if loading from different domain
- Check browser console for errors

### Images Not Showing
- Ensure `svgBaseUrl` parameter points to accessible images
- Check that images are served with correct MIME types
- Use `&svgFromApi=true` to load from CryptoKitties API

### Viewport Not Preserving
- Verify viewport parameters are in URL (`zoom`, `viewX`, `viewY` for 2D; `cameraX`, `cameraY`, `cameraZ` for 3D)
- Ensure parameters match the viewer type (2D params won't work in 3D viewer)
- Check that values are numeric (decimals allowed)

### Switcher Not Hiding
- Add `&switcher=false` to URL
- Check for typos in parameter name
- Verify boolean value is `false` or `0` (not `no` or `hidden`)
