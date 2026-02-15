/* CryptoKitties Family Graph - 3D Version */
import { ForceGraph3D, THREE, ViewportGizmo } from './vendor-3d.js';

// Make available globally for debugging
window.ForceGraph3D = ForceGraph3D;
window.THREE = THREE;
window.ViewportGizmo = ViewportGizmo;

(() => {
  // ===================== GLOBALS =====================
  const bannerEl = $("banner");
  const statsPill = $("statsPill");
  const tooltipEl = $("tooltip");

  // Override log functions for 3D-specific prefix
  const sharedLog = log;
  const sharedLogv = logv;
  log = (...args) => { if (debugLevel() >= 1) console.log("[CKGRAPH3D]", ...args); };
  logv = (...args) => { if (debugLevel() >= 2) console.log("[CKGRAPH3D:VV]", ...args); };

  // ===================== 3D-SPECIFIC STATE =====================
  // Shared state is in CKGraph (base.js) - create local aliases for convenience
  const kittyById = CKGraph.kittyById;
  const expandedIds = CKGraph.expandedIds;
  const cachedApiResponses = CKGraph.cachedApiResponses;

  // Local state variables that shadow CKGraph properties for easier access
  // Note: These need to be kept in sync with CKGraph when modified
  let selectedNodeId = null;
  let shortestPathMode = false;
  let lockedPathToId = null;
  let ownerHighlightLocked = false;
  let lockedOwnerAddr = null;
  let lockedOwnerNick = null;
  let generationHighlightActive = false;
  let generationRangeMin = null;
  let generationRangeMax = null;
  let mewtationHighlightActive = false;
  let highlightedGemTypes = new Set();
  let myKittyIds = new Set();
  let loadedFromDataUrl = null;
  let foreignCam2d = null; // Store 2D viewport for round-trip preservation
  let highlightedTraitGemNodes = new Set();

  let graph = null;
  let viewportGizmo = null;
  let graphData = { nodes: [], links: [] };
  let zAxisMode = "generation";

  // Context menu state
  let contextMenuNodeId = null;

  // Double-click detection state
  let lastClickTime = 0;
  let lastClickNodeId = null;
  const DOUBLE_CLICK_THRESHOLD = 300; // milliseconds

  // Track mouse position for context menu
  let lastMouseX = 0;
  let lastMouseY = 0;

  // Texture cache for node sprites
  const textureCache = new Map();

  // 3D-specific path highlighting (uses findShortestPath from base.js)
  let highlightedPath = new Set();
  let highlightedPathLinks = new Set();

  // ===================== API / DATA LOADING =====================
  // (fetchJson, unwrapKitty, normalizeFromApi imported from shared.js)
  // formatDateTimeFull, gemDisplayName, cattributeUrl, gemsHtml are in base.js

  // ===================== Z-AXIS CALCULATION =====================
  function calculateZPosition(kitty) {
    const baseZ = 0;

    // Dynamically adjust max Z spread based on dataset size
    const datasetSize = kittyById.size;
    let maxZSpread = 800; // Default
    if (datasetSize > 500) {
      maxZSpread = 1000; // Larger spread for big datasets
    } else if (datasetSize < 50) {
      maxZSpread = 600; // Tighter spread for small datasets
    }

    switch (zAxisMode) {
      case "generation":
        // Higher generation = lower Z (younger cats at bottom)
        const gen = typeof kitty.generation === "number" ? kitty.generation : 0;
        const allGens = Array.from(kittyById.values()).map(k => k.generation || 0);
        const minGen = Math.min(...allGens);
        const maxGen = Math.max(...allGens);
        const genRange = maxGen - minGen;

        if (genRange === 0) return baseZ;

        // Normalize to [0, 1] and scale to maxZSpread
        // Inverted: older generation (lower number) = higher Z
        const normalized = (maxGen - gen) / genRange;
        return normalized * maxZSpread;

      case "birthday":
        // Older cats higher
        const date = new Date(kitty.created_at || kitty.birthday || 0);
        const allDates = Array.from(kittyById.values()).map(k => {
          const d = new Date(k.created_at || k.birthday || 0);
          return d.getTime();
        });
        const minDate = Math.min(...allDates);
        const maxDate = Math.max(...allDates);
        const dateRange = maxDate - minDate;

        if (dateRange === 0) return baseZ;

        // Inverted: older date (lower timestamp) = higher Z
        const dateVal = date.getTime();
        const dateNormalized = (dateVal - minDate) / dateRange;
        return (1 - dateNormalized) * maxZSpread;

      case "rarity":
        // Kitties with rarer mewtations get higher Z
        // Use actual discovery position (1-500) for fine-grained rarity
        const gems = getMewtationGems(kitty);
        if (gems.length === 0) return baseZ;

        // Get the best (lowest position number = rarest) gem
        const bestPosition = Math.min(...gems.map(g => g.position));

        // Invert position so lower position = higher Z
        // Map 1-500 to maxZSpread-0 (position 1 is highest)
        const rarityNormalized = (500 - bestPosition) / 500;
        return rarityNormalized * maxZSpread;

      case "flat":
      default:
        return baseZ;
    }
  }

  // ===================== GRAPH DATA BUILDING =====================
  function buildGraphData() {
    const nodes = [];
    const links = [];
    const nodeIds = new Set();

    for (const [id, k] of kittyById.entries()) {
      nodeIds.add(Number(id));
      const colors = getKittyColors(k);
      const gems = getMewtationGems(k);
      const z = calculateZPosition(k);

      nodes.push({
        id: Number(id),
        name: nodeLabel(k),
        kitty: k,
        color: colors.background,
        shadowColor: colors.shadow,
        gems,
        generation: k.generation,
        imageUrl: k.image_url,
        fx: null,
        fy: null,
        fz: z // Fixed Z based on mode
      });
    }

    for (const [id, k] of kittyById.entries()) {
      const matronId = k.matron_id ? Number(k.matron_id) : null;
      const sireId = k.sire_id ? Number(k.sire_id) : null;
      const targetId = Number(id);

      if (matronId && nodeIds.has(matronId)) {
        links.push({
          source: matronId,
          target: targetId,
          type: "matron",
          color: "#ff5aa5"
        });
      }
      if (sireId && nodeIds.has(sireId)) {
        links.push({
          source: sireId,
          target: targetId,
          type: "sire",
          color: "#4aa8ff"
        });
      }
    }

    log("buildGraphData:", { nodes: nodes.length, links: links.length });

    // Validate all links have valid source/target
    for (const link of links) {
      const srcExists = nodes.some(n => n.id === link.source);
      const tgtExists = nodes.some(n => n.id === link.target);
      if (!srcExists || !tgtExists) {
        console.warn("Invalid link:", link, "srcExists:", srcExists, "tgtExists:", tgtExists);
      }
    }

    return { nodes, links };
  }

  // ===================== TEXTURE LOADING =====================
  // Determine texture resolution based on graph size to balance quality and performance
  function getTextureSize() {
    const nodeCount = kittyById.size;
    let size;
    if (nodeCount < 50) {
      size = 512;      // High quality for small graphs
    } else if (nodeCount < 150) {
      size = 256;     // Medium quality for moderate graphs
    } else {
      size = 128;     // Lower quality for large graphs (memory efficiency)
    }
    log(`Texture resolution: ${size}x${size} (${nodeCount} nodes)`);
    return size;
  }

  function loadKittyTexture(imageUrl, bgColor) {
    if (!imageUrl) return createColorTexture(bgColor);

    const size = getTextureSize();
    const cacheKey = `${imageUrl}|${bgColor}|${size}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);

    // Create a canvas texture with background color, then draw image on top
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Fill with background color first
    ctx.fillStyle = bgColor || "#23283b";
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    // Set anisotropy to max supported by GPU (will be set after graph is initialized)
    if (graph && graph.renderer()) {
      texture.anisotropy = graph.renderer().capabilities.getMaxAnisotropy();
    }
    textureCache.set(cacheKey, texture);

    // Load image and draw on top of background
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);
      texture.needsUpdate = true;
      if (graph) graph.refresh();
    };
    img.onerror = () => {
      log("Failed to load image:", imageUrl);
      // Keep the solid color texture
      if (graph) graph.refresh();
    };
    img.src = imageUrl;

    return texture;
  }

  function createColorTexture(color) {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Draw circle with color
    ctx.fillStyle = color || "#23283b";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }


  // ===================== NODE RENDERING =====================
  function createNodeObject(node) {
    const size = 16;
    const k = node.kitty;
    const colors = getKittyColors(k);

    // Check for shortest path mode highlighting (highest priority)
    const pathModeActive = shortestPathMode && selectedNodeId && highlightedPath.size > 0;
    const isInPath = pathModeActive && highlightedPath.has(node.id);
    const isDimmedByPath = pathModeActive && !isInPath;

    // Check for owner highlighting (second priority)
    const ownerModeActive = ownerHighlightLocked && (lockedOwnerAddr || lockedOwnerNick);
    const isOwnedByHighlightedOwner = ownerModeActive && doesKittyMatchOwner(k,
      lockedOwnerAddr ? lockedOwnerAddr.toLowerCase() : null,
      lockedOwnerNick ? lockedOwnerNick.toLowerCase() : null
    );
    const isDimmedByOwner = ownerModeActive && !isOwnedByHighlightedOwner;

    // Check for trait/gem hover highlighting (third priority)
    const traitGemHoverActive = highlightedTraitGemNodes.size > 0;
    const isTraitGemHighlighted = traitGemHoverActive && highlightedTraitGemNodes.has(node.id);
    const isTraitGemDimmed = traitGemHoverActive && !isTraitGemHighlighted;

    // Check if this node matches active filters for highlighting (fourth priority)
    const filterActive = generationHighlightActive || mewtationHighlightActive;
    const isHighlighted = filterActive && CKGraph.doesKittyMatchFilters(k);
    const isDimmed = filterActive && !isHighlighted;

    // Create sphere geometry
    const geometry = new THREE.SphereGeometry(size, 32, 32);

    // Load texture (includes background color composite)
    const texture = loadKittyTexture(node.imageUrl, colors.background);
    const materialConfig = {
      map: texture,
      metalness: 0.3,
      roughness: 0.7
    };

    // Apply highlighting: path mode > owner highlight > trait/gem hover > filters
    if (isInPath) {
      // Brighten nodes in the path with strong emissive glow
      const rgb = hexToRgb(colors.background);
      materialConfig.emissive = new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
      materialConfig.emissiveIntensity = node.id === selectedNodeId ? 0.4 : 0.45;
      materialConfig.color = new THREE.Color(1.2, 1.2, 1.2); // Brighten the color
    } else if (isDimmedByPath) {
      // Dim nodes not in path during shortest path mode
      materialConfig.emissive = new THREE.Color(0, 0, 0);
      materialConfig.emissiveIntensity = 0;
      materialConfig.color = new THREE.Color(0.25, 0.25, 0.25);
    } else if (isOwnedByHighlightedOwner) {
      // Brighten owned kitties with blue-tinted glow
      const rgb = hexToRgb(colors.background);
      materialConfig.emissive = new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
      materialConfig.emissiveIntensity = node.id === selectedNodeId ? 0.3 : 0.4;
      materialConfig.color = new THREE.Color(1.15, 1.15, 1.2); // Slight blue tint
    } else if (isDimmedByOwner) {
      // Dim non-owned kitties during owner highlight mode
      materialConfig.emissive = new THREE.Color(0, 0, 0);
      materialConfig.emissiveIntensity = 0;
      materialConfig.color = new THREE.Color(0.3, 0.3, 0.3);
    } else if (isTraitGemDimmed) {
      // Dim non-matching nodes during trait/gem hover
      materialConfig.emissive = new THREE.Color(0, 0, 0);
      materialConfig.emissiveIntensity = 0;
      materialConfig.color = new THREE.Color(0.3, 0.3, 0.3);
    } else if (isTraitGemHighlighted || (node.id === selectedNodeId && traitGemHoverActive)) {
      // Brighten matching nodes with glow during trait/gem hover
      const rgb = hexToRgb(colors.background);
      materialConfig.emissive = new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
      materialConfig.emissiveIntensity = node.id === selectedNodeId ? 0.3 : 0.35;
      materialConfig.color = new THREE.Color(1, 1, 1);
    } else if (isDimmed) {
      // Darken by applying a gray color tint (lighter so kitty is still visible)
      materialConfig.color = new THREE.Color(0x555555);
    } else if (isHighlighted) {
      // Add subtle emissive glow to highlighted nodes
      const rgb = hexToRgb(colors.background);
      materialConfig.emissive = new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
      materialConfig.emissiveIntensity = 0.25;  // Reduced from 0.6 for better visibility
    }

    const material = new THREE.MeshStandardMaterial(materialConfig);
    const sphere = new THREE.Mesh(geometry, material);

    // Rotate sphere so edges connect at the sides (left-right) instead of front-back
    // X rotation tilts the texture, Y rotation orients the face toward camera
    sphere.rotation.x = Math.PI / 2;
    sphere.rotation.y = Math.PI / 2;

    // Store node ID in userData for hover highlighting
    sphere.userData.nodeId = node.id;

    // Add selection ring if selected
    if (selectedNodeId === node.id) {
      const ringGeometry = new THREE.RingGeometry(size * 1.2, size * 1.4, 32);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        emissive: 0xffffff,
        emissiveIntensity: 0.5
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      // Rotate ring 90 degrees around Y axis
      ring.rotation.y = Math.PI / 2;
      sphere.add(ring);
    }

    // Add gem indicator if has mewtations
    if (node.gems && node.gems.length > 0) {
      const topGem = node.gems.sort((a, b) => {
        const priority = { diamond: 4, gold: 3, silver: 2, bronze: 1 };
        return (priority[b.gem] || 0) - (priority[a.gem] || 0);
      })[0];

      const gemColors = { diamond: 0xb9f2ff, gold: 0xffd700, silver: 0xe8e8e8, bronze: 0xcd7f32 };
      let gemGeometry;

      // Use different 3D shapes for each gem type
      switch (topGem.gem) {
        case "diamond":
          // Octahedron - classic diamond shape
          gemGeometry = new THREE.OctahedronGeometry(5);
          break;
        case "gold":
          // Icosahedron - lumpy nugget shape
          gemGeometry = new THREE.IcosahedronGeometry(4);
          break;
        case "silver":
          // Tetrahedron - crystal shard
          gemGeometry = new THREE.TetrahedronGeometry(5);
          break;
        case "bronze":
        default:
          // Dodecahedron - rounded gem
          gemGeometry = new THREE.DodecahedronGeometry(4);
          break;
      }

      // Create material based on gem type
      let gemMaterial;
      if (topGem.gem === "diamond") {
        // Diamond: transparent, highly reflective crystal
        gemMaterial = new THREE.MeshPhysicalMaterial({
          color: gemColors.diamond,
          metalness: 0,
          roughness: 0,
          opacity: 0.4,
          transparent: true,
          reflectivity: 2.0,
          clearcoat: 1.0,
          clearcoatRoughness: 0,
          ior: 2.4, // Index of refraction for diamond
          envMapIntensity: 1.5,
          emissive: 0x4dd9ff,
          emissiveIntensity: 0.2
        });
      } else if (topGem.gem === "gold") {
        // Gold: metallic with slight roughness
        gemMaterial = new THREE.MeshPhysicalMaterial({
          color: gemColors.gold,
          metalness: 1.0,
          roughness: 0.2,
          reflectivity: 0.9,
          clearcoat: 0.5,
          clearcoatRoughness: 0.3,
          emissive: 0x886600,
          emissiveIntensity: 0.15
        });
      } else if (topGem.gem === "silver") {
        // Silver: metallic, brighter than gold
        gemMaterial = new THREE.MeshPhysicalMaterial({
          color: gemColors.silver,
          metalness: 1.0,
          roughness: 0.15,
          reflectivity: 0.95,
          clearcoat: 0.6,
          clearcoatRoughness: 0.2,
          emissive: 0x888888,
          emissiveIntensity: 0.1
        });
      } else {
        // Bronze: metallic, slightly duller
        gemMaterial = new THREE.MeshPhysicalMaterial({
          color: gemColors.bronze,
          metalness: 0.9,
          roughness: 0.35,
          reflectivity: 0.7,
          clearcoat: 0.3,
          clearcoatRoughness: 0.4,
          emissive: 0x442200,
          emissiveIntensity: 0.1
        });
      }

      const gemMesh = new THREE.Mesh(gemGeometry, gemMaterial);
      gemMesh.position.set(size * 0.7, size * 0.9, 0);
      // Rotate diamond to point upward
      if (topGem.gem === "diamond") {
        gemMesh.rotation.x = Math.PI / 4;
      }
      sphere.add(gemMesh);
    }

    return sphere;
  }

  // ===================== HIGHLIGHTING / FILTERING =====================
  // doesKittyMatchFilters, buildAdjacency, findShortestPath are in base.js

  function getNodeOpacity(node) {
    // Always return full opacity - we use color darkening instead for dimming
    return 1;
  }

  function getLinkOpacity(link) {
    const filterActive = generationHighlightActive || mewtationHighlightActive;
    if (!filterActive) return 0.6;

    const sourceNode = graphData.nodes.find(n => n.id === (typeof link.source === "object" ? link.source.id : link.source));
    const targetNode = graphData.nodes.find(n => n.id === (typeof link.target === "object" ? link.target.id : link.target));

    if (sourceNode && targetNode) {
      const sourceMatch = CKGraph.doesKittyMatchFilters(sourceNode.kitty);
      const targetMatch = CKGraph.doesKittyMatchFilters(targetNode.kitty);
      if (sourceMatch && targetMatch) return 0.8;
    }
    return 0.1;
  }

  // ===================== TOOLTIP =====================
  function showTooltip(node, event) {
    if (!tooltipEl || !node) return;
    const k = node.kitty;
    if (!k) return;

    const img = k.image_url || "";
    const title = safeText(k.name || `Kitty ${k.id}`);
    let sub = `#${k.id}` + (typeof k.generation === "number" ? ` · Gen ${k.generation}` : "");

    // Add path info if in shortest path mode
    if (shortestPathMode && selectedNodeId) {
      if (node.id === selectedNodeId) {
        sub += ` · <span style="color:#7aa2ff">Selected</span>`;
      } else {
        const path = CKGraph.findShortestPath(selectedNodeId, node.id);
        if (path.length > 0) {
          const hops = path.length - 1;
          const hopWord = hops === 1 ? "hop" : "hops";
          sub += ` · <span style="color:#7aa2ff">${hops} ${hopWord}</span>`;
        } else {
          sub += ` · <span style="color:#ff6b6b">No path</span>`;
        }
      }
    }

    const born = formatDatePretty(k.created_at || k.birthday || "");
    const traits = k.traits || {};
    const traitKeys = Object.keys(traits).slice(0, 4);
    const colors = getKittyColors(k);
    const gems = getMewtationGems(k);
    const gemsCompact = gemsHtml(gems, true);

    // Build traits HTML with mewtation highlighting
    const traitsHtml = traitKeys.map(t => {
      const gem = gems.find(g => g.type === t);
      if (gem) {
        return `<span class="tag tag-mewtation" title="${gemDisplayName(gem.gem)} #${gem.position}">
          <img src="${GEM_IMAGES[gem.gem]}" alt="" class="gem-icon gem-icon-sm" />
          ${t}: ${safeText(traits[t])}
        </span>`;
      }
      return `<span class="tag">${t}: ${safeText(traits[t])}</span>`;
    }).join("");

    tooltipEl.innerHTML = `
      <div class="tt-head">
        <div class="tt-thumb" style="background:${colors.background};--shadow-color:${colors.shadow};">
          ${img ? `<img src="${img}" alt="" />` : ""}
        </div>
        <div>
          <div class="tt-title">${title}${gemsCompact ? ` ${gemsCompact}` : ""}</div>
          <div class="tt-sub">${sub}${born ? ` · ${born}` : ""}</div>
        </div>
      </div>
      <div class="tt-body">
        ${traitKeys.length ? `<div>${traitsHtml}</div>` : ""}
      </div>
    `;

    tooltipEl.style.display = "block";
    tooltipEl.style.left = "16px";
    tooltipEl.style.top = "70px";
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = "none";
  }

  // ===================== CONTEXT MENU =====================
  const contextMenuEl = $("contextMenu");

  function showContextMenu(nodeId, event) {
    if (!contextMenuEl) return;
    if (!event || (!event.clientX && event.clientX !== 0)) {
      console.warn("showContextMenu: invalid event object", event);
      return;
    }

    contextMenuNodeId = nodeId;

    const k = kittyById.get(nodeId);
    if (!k) return;

    // Update disabled states
    const expandItem = contextMenuEl.querySelector('[data-action="expand"]');
    if (expandItem) {
      if (expandedIds.has(nodeId)) {
        expandItem.classList.add("disabled");
      } else {
        expandItem.classList.remove("disabled");
      }
    }

    // Update highlight owner text and icon based on current state
    const highlightItem = contextMenuEl.querySelector('[data-action="highlightOwner"]');
    if (highlightItem) {
      const isSameOwner = ownerHighlightLocked && doesKittyMatchOwner(k,
        lockedOwnerAddr ? lockedOwnerAddr.toLowerCase() : null,
        lockedOwnerNick ? lockedOwnerNick.toLowerCase() : null
      );

      if (isSameOwner) {
        highlightItem.classList.add("active");
      } else {
        highlightItem.classList.remove("active");
      }

      const textSpan = highlightItem.querySelector(".menu-text");
      if (textSpan) {
        textSpan.textContent = isSameOwner ? "Unhighlight owner" : "Highlight owner";
      }

      const iconSpan = highlightItem.querySelector(".menu-icon");
      if (iconSpan) {
        iconSpan.innerHTML = isSameOwner
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
              <path d="M12 1v1M17.5 3.5l-.7.7M21 9h-1M3 9h1M6.5 3.5l.7.7" stroke-width="1.5"/>
            </svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      }
    }

    // Position menu at click location
    contextMenuEl.style.display = "block";
    const menuRect = contextMenuEl.getBoundingClientRect();
    let x = event.clientX || 0;
    let y = event.clientY || 0;

    // Keep menu within viewport bounds
    if (x + menuRect.width > window.innerWidth) {
      x = window.innerWidth - menuRect.width - 10;
    }
    if (y + menuRect.height > window.innerHeight) {
      y = window.innerHeight - menuRect.height - 10;
    }

    contextMenuEl.style.left = `${x}px`;
    contextMenuEl.style.top = `${y}px`;

    log("showContextMenu:", nodeId, "at", x, y);
  }

  function hideContextMenu() {
    if (contextMenuEl) {
      contextMenuEl.style.display = "none";
      contextMenuNodeId = null;
    }
  }

  // Wire up context menu actions
  if (contextMenuEl) {
    contextMenuEl.addEventListener("click", (e) => {
      const item = e.target.closest(".context-menu-item");
      if (!item || item.classList.contains("disabled")) return;

      const action = item.dataset.action;
      const nodeId = contextMenuNodeId;
      hideContextMenu();

      if (!nodeId) return;

      const k = kittyById.get(nodeId);
      if (!k) return;

      switch (action) {
        case "center":
          // Find the node in graph data and center camera on it while preserving viewing angle
          const node = graphData.nodes.find(n => n.id === nodeId);
          if (node && graph) {
            const currentCamPos = graph.cameraPosition();
            const distance = 200;

            // Calculate direction from node to current camera
            const dx = currentCamPos.x - (node.x || 0);
            const dy = currentCamPos.y - (node.y || 0);
            const dz = currentCamPos.z - (node.z || 0);
            const currentDist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            // Normalize direction and scale to desired distance
            const scale = distance / currentDist;

            // Set camera up vector to prevent upside-down orientation
            const camera = graph.camera();
            camera.up.set(0, 1, 0);

            graph.cameraPosition(
              { x: (node.x || 0) + dx * scale, y: (node.y || 0) + dy * scale, z: (node.z || 0) + dz * scale },
              node,
              1000
            );
          }
          break;

        case "expand":
          CKGraph.expandFamily(nodeId);
          break;

        case "highlightOwner":
          const ownerAddr = k.owner_address || normalizeOwner(k.owner) || null;
          const ownerNick = k.owner_nickname || normalizeOwnerNickname(k) || null;

          const isSameOwner = ownerHighlightLocked && doesKittyMatchOwner(k,
            lockedOwnerAddr ? lockedOwnerAddr.toLowerCase() : null,
            lockedOwnerNick ? lockedOwnerNick.toLowerCase() : null
          );

          if (isSameOwner) {
            // Unhighlight
            ownerHighlightLocked = false;
            lockedOwnerAddr = null;
            lockedOwnerNick = null;
            if (graph) graph.refresh();
          } else {
            // Highlight and lock
            ownerHighlightLocked = true;
            lockedOwnerAddr = ownerAddr;
            lockedOwnerNick = ownerNick;
            CKGraph.highlightOwnerKitties(ownerAddr, ownerNick);
          }
          break;

        case "openOwner":
          const addr = k.owner_address || normalizeOwner(k.owner);
          if (addr) window.open(ownerUrl(addr), "_blank", "noopener");
          break;

        case "copyId":
          navigator.clipboard.writeText(String(nodeId)).then(() => {
            setStatus(`Copied kitty ID ${nodeId}`, false);
          });
          break;

        case "openCK":
          window.open(kittyUrl(nodeId), "_blank", "noopener");
          break;
      }
    });

    // Hide context menu when clicking outside
    document.addEventListener("click", (e) => {
      if (contextMenuEl && contextMenuEl.style.display === "block") {
        if (!contextMenuEl.contains(e.target)) {
          hideContextMenu();
        }
      }
    });
  }

  // ===================== OWNER HIGHLIGHTING =====================
  // highlightOwnerKitties is in base.js - it calls CKGraph.onRefresh

  // ===================== EXPANSION =====================
  // expandFamily is in base.js - wrap it to handle 3D-specific graph rebuild
  async function expand3DFamily(id) {
    await CKGraph.expandFamily(id); // base.js function - calls CKGraph.onDataLoaded
    // 3D-specific: refresh selected panel if this was the selected node
    if (CKGraph.selectedNodeId === id) {
      showSelected(id);
    }
  }

  // ===================== SELECTION PANEL =====================
  // lookupOwnerNickname and formatEth are in base.js

  function showSelected(id) {
    const k = kittyById.get(id);
    const section = $("selectedSection");
    const box = $("selectedBox");
    const toggle = $("selectedToggle");
    const body = $("selectedBody");
    const floatingBox = $("floatingSelectedBox");

    // Update regular panel (non-embed mode)
    if (section && box) {
      if (!k) {
        section.style.display = "none";
      } else {
        section.style.display = "block";

        // Ensure section is expanded when showing selected kitty
        if (toggle && body) {
          toggle.classList.remove("collapsed");
          body.style.display = "block";
        }

        box.innerHTML = renderKittyDetails(k, id);
        // Set up handlers for regular panel
        setupTraitHighlightHandlers(box);
        setupGemHighlightHandlers(box);
        setupOwnerHighlightHandlers(box, id);
      }
    }

    // Update floating panel (embed mode)
    if (floatingBox) {
      const floatingPanel = $("floatingPanel");
      if (!k) {
        floatingBox.innerHTML = "Click a kitty to select";
      } else {
        floatingBox.innerHTML = renderKittyDetails(k, id);
        // Set up handlers for floating panel
        setupTraitHighlightHandlers(floatingBox);
        setupGemHighlightHandlers(floatingBox);
        setupOwnerHighlightHandlers(floatingBox, id);

        // Re-open panel if it was closed
        if (floatingPanel && floatingPanel.classList.contains("panel-hidden")) {
          floatingPanel.classList.remove("panel-hidden");
        }
      }
    }
  }

  // Set up owner highlight handlers
  function setupOwnerHighlightHandlers(container, id) {
    const ownerLink = container.querySelector(".owner-link");
    const highlightBtn = container.querySelector(".owner-highlight-btn");

    if (ownerLink) {
      ownerLink.addEventListener("mouseenter", () => {
        if (ownerHighlightLocked) return;
        const addr = ownerLink.dataset.owner || null;
        const nick = ownerLink.dataset.ownerNick || null;
        CKGraph.highlightOwnerKitties(addr, nick);
      });
      ownerLink.addEventListener("mouseleave", () => {
        if (ownerHighlightLocked) return;
        // Clear highlight - refresh to restore normal colors
        if (graph) graph.refresh();
      });
    }

    if (highlightBtn) {
      highlightBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const addr = highlightBtn.dataset.owner || null;
        const nick = highlightBtn.dataset.ownerNick || null;

        const isSameOwner = ownerHighlightLocked &&
          ((lockedOwnerAddr && addr && lockedOwnerAddr.toLowerCase() === addr.toLowerCase()) ||
           (lockedOwnerNick && nick && lockedOwnerNick.toLowerCase() === nick.toLowerCase()));

        if (isSameOwner) {
          // Unlock
          ownerHighlightLocked = false;
          lockedOwnerAddr = null;
          lockedOwnerNick = null;
          if (graph) graph.refresh();
          log("Owner highlight unlocked");
        } else {
          // Lock
          ownerHighlightLocked = true;
          lockedOwnerAddr = addr;
          lockedOwnerNick = nick;
          CKGraph.highlightOwnerKitties(addr, nick);
          log("Owner highlight locked:", { addr, nick });
        }

        // Re-render to update button state
        showSelected(id);
      });
    }
  }

  // Set up trait highlight handlers
  function setupTraitHighlightHandlers(container) {
    const traitTags = container.querySelectorAll(".tag-trait");
    traitTags.forEach(tag => {
      tag.addEventListener("mouseenter", () => {
        const traitValue = tag.dataset.trait;
        if (traitValue) highlightByTrait(traitValue);
      });
      tag.addEventListener("mouseleave", () => {
        clearTraitGemHighlight();
      });
    });
  }

  // Set up gem highlight handlers
  function setupGemHighlightHandlers(container) {
    const gemBadges = container.querySelectorAll(".gem-badge, .gem-item, .tag-mewtation");
    gemBadges.forEach(badge => {
      badge.addEventListener("mouseenter", () => {
        const gemType = badge.dataset.gem;
        if (gemType) highlightByGemType(gemType);
      });
      badge.addEventListener("mouseleave", () => {
        clearTraitGemHighlight();
      });
    });
  }

  function renderKittyDetails(k, id) {
    const colors = getKittyColors(k);
    const raw = k.raw || k; // Fallback to k itself if raw not present

    // === COLOR DISPLAY ===
    const colorName = k.color || null;
    const bgColorHtml = colors.isUnknown
      ? `<span class="small auction-warning">Unknown</span>`
      : `<span class="color-swatch" style="background:${colors.background}"></span>${colorName ? safeText(colorName) : colors.background}`;

    // === OWNER INFO ===
    let rawOwnerAddr = k.owner_address || normalizeOwner(k.owner) || null;
    let displayOwnerAddr = null;
    let displayOwnerNick = null;
    let showAuctionStatus = false;
    let auctionContractName = null;

    // Check if on auction
    const auction = k.auction || raw.auction || null;
    const isOnAuction = auction && (auction.type === "sale" || auction.type === "sire");
    const auctionType = auction?.type || null;

    // If on auction, owner field might be the auction contract
    if (isOnAuction && rawOwnerAddr) {
      // Try to get real owner from seller field
      const seller = k.seller || auction?.seller || null;
      if (seller) {
        const sellerAddr = normalizeOwner(seller);
        const sellerNick = seller?.nickname || seller?.username || seller?.name || null;
        if (sellerAddr || sellerNick) {
          displayOwnerAddr = sellerAddr;
          displayOwnerNick = sellerNick;
        }
      }

      // If still no owner info, show auction status instead
      if (!displayOwnerAddr && !displayOwnerNick) {
        displayOwnerAddr = null;
        displayOwnerNick = null;
        showAuctionStatus = true;
        auctionContractName = getContractName(rawOwnerAddr) || "Auction";
      } else {
        showAuctionStatus = false;
      }
    } else {
      // Normal case - check if owner is an auction contract even without auction data
      const ownerIsContract = isAuctionContract(rawOwnerAddr);
      if (ownerIsContract) {
        // Owner is a contract - try to get real owner from hatcher
        const hatcher = raw.hatcher || k.hatcher || null;
        if (hatcher && typeof hatcher === "object") {
          const hatcherAddr = normalizeOwner(hatcher);
          const hatcherNick = hatcher.nickname || hatcher.username || hatcher.name || null;
          if (hatcherAddr && !isAuctionContract(hatcherAddr)) {
            displayOwnerAddr = hatcherAddr;
            displayOwnerNick = hatcherNick;
          }
        }
        // If still no real owner, show auction status
        if (!displayOwnerAddr && !displayOwnerNick) {
          showAuctionStatus = true;
          auctionContractName = getContractName(rawOwnerAddr);
        }
      } else {
        displayOwnerAddr = rawOwnerAddr;
        displayOwnerNick = k.owner_nickname || normalizeOwnerNickname(k) || null;
        showAuctionStatus = false;
      }
    }

    // Lookup nickname from other kitties if we have address but no nickname
    if (displayOwnerAddr && !displayOwnerNick) {
      displayOwnerNick = lookupOwnerNickname(displayOwnerAddr);
    }

    const ownerText = displayOwnerNick || (displayOwnerAddr ? shortAddr(displayOwnerAddr) : null);

    // Build owner HTML with highlight button
    let ownerHtml;
    if (displayOwnerAddr || displayOwnerNick) {
      const dataOwner = displayOwnerAddr ? `data-owner="${safeText(displayOwnerAddr)}"` : "";
      const dataNick = displayOwnerNick ? `data-owner-nick="${safeText(displayOwnerNick)}"` : "";
      const linkHref = displayOwnerAddr ? ownerUrl(displayOwnerAddr) : "#";
      const isLocked = ownerHighlightLocked &&
        ((lockedOwnerAddr && displayOwnerAddr && lockedOwnerAddr.toLowerCase() === displayOwnerAddr.toLowerCase()) ||
         (lockedOwnerNick && displayOwnerNick && lockedOwnerNick.toLowerCase() === displayOwnerNick.toLowerCase()));
      const btnTitle = isLocked ? "Unhighlight owner" : "Highlight owner";
      const btnClass = isLocked ? "owner-highlight-btn active" : "owner-highlight-btn";
      const highlightIcon = isLocked
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
            <path d="M12 1v1M17.5 3.5l-.7.7M21 9h-1M3 9h1M6.5 3.5l.7.7" stroke-width="1.5"/>
          </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>`;
      ownerHtml = `<span class="owner-row">
        <button class="${btnClass}" ${dataOwner} ${dataNick} title="${btnTitle}">${highlightIcon}</button>
        <a href="${linkHref}" target="_blank" rel="noopener" class="owner-link" ${dataOwner} ${dataNick}>${safeText(ownerText)}</a>
      </span>`;
    } else if (showAuctionStatus) {
      const auctionLabel = auctionContractName || "On Auction";
      ownerHtml = `<span class="small auction-warning">${auctionLabel}</span>`;
    } else {
      ownerHtml = `<span class="small muted">Unknown</span>`;
    }

    // === STATUS (auction) ===
    let statusHtml = "";
    if (isOnAuction) {
      const statusLabel = auctionType === "sire" ? "For Siring" : "For Sale";
      const currentPrice = formatEth(auction.current_price);
      const priceHtml = currentPrice ? ` · ${currentPrice}` : "";
      statusHtml = `<div class="k">Status</div><div class="v"><a href="${kittyUrl(id)}" target="_blank" rel="noopener" class="tag auction-tag">${statusLabel}${priceHtml}</a></div>`;
    }

    // === BORN DATE ===
    const birthDate = k.created_at || k.birthday || "";
    const bornHtml = birthDate
      ? `<span title="${safeText(formatDateTimeFull(birthDate))}">${formatDatePretty(birthDate)}</span>`
      : "";

    // === CHILDREN ===
    const apiChildren = raw.children;
    const totalChildren = Array.isArray(apiChildren) ? apiChildren.length : null;

    let childrenInGraph = 0;
    for (const [_, kitty] of kittyById.entries()) {
      if (kitty.matron_id === id || kitty.sire_id === id) {
        childrenInGraph++;
      }
    }

    let childrenHtml;
    if (totalChildren !== null) {
      if (totalChildren === 0) {
        childrenHtml = "0";
      } else if (childrenInGraph < totalChildren) {
        childrenHtml = `${totalChildren} <span class="small muted">(${childrenInGraph} shown)</span>`;
      } else {
        childrenHtml = `${totalChildren}`;
      }
    } else {
      childrenHtml = `<span class="small muted">Unknown</span>`;
    }

    // === TRAITS ===
    const traits = k.traits || {};
    const traitKeys = Object.keys(traits).slice(0, 12);
    const gems = getMewtationGems(k);
    const gemsFull = gemsHtml(gems, false);

    const traitsHtml = traitKeys.map(t => {
      const gem = gems.find(g => g.type === t);
      if (gem) {
        return `<span class="tag tag-mewtation" data-gem="${gem.gem}" data-trait="${safeText(traits[t])}" title="${gemDisplayName(gem.gem)} #${gem.position}">
          <img src="${GEM_IMAGES[gem.gem]}" alt="" class="gem-icon gem-icon-sm" />
          ${t}: <a href="${cattributeUrl(traits[t])}" target="_blank" class="trait-link">${safeText(traits[t])}</a>
        </span>`;
      }
      return `<span class="tag tag-trait" data-trait="${safeText(traits[t])}">${t}: <a href="${cattributeUrl(traits[t])}" target="_blank" class="trait-link">${safeText(traits[t])}</a></span>`;
    }).join("");

    const kittyImg = k.image_url || "";

    return `
      <div class="selected-header">
        <div class="selected-thumb" style="background:${colors.background};--shadow-color:${colors.shadow};">
          ${kittyImg ? `<img src="${kittyImg}" alt="" />` : ""}
        </div>
        <div>
          <div class="kitty-name"><a href="${kittyUrl(id)}" target="_blank">${safeText(k.name || `Kitty ${k.id}`)}</a></div>
          <div class="kitty-meta">#${k.id} · Gen ${safeText(k.generation)}</div>
        </div>
      </div>
      <div class="kv">
        <div class="k">Color</div>
        <div class="v">${bgColorHtml}</div>
        <div class="k">Born</div>
        <div class="v">${bornHtml}</div>
        <div class="k">Owner</div>
        <div class="v">${ownerHtml}</div>
        ${statusHtml}
        <div class="k">Children</div>
        <div class="v">${childrenHtml}</div>
        ${gems.length ? `<div class="k">Mewtations</div><div class="v gems-list">${gemsFull}</div>` : ""}
        <div class="k">Traits</div>
        <div class="v">${traitKeys.length ? traitsHtml : "<span class='small muted'>None</span>"}</div>
      </div>
    `;
  }

  function hideSelected() {
    const section = $("selectedSection");
    if (section) section.style.display = "none";
  }

  // ===================== FLOATING PANEL (EMBED MODE) =====================
  function setupFloatingPanel(showSwitcher) {
    const panel = $("floatingPanel");
    const closeBtn = $("floatingPanelClose");
    const dragHandle = $("floatingPanelDragHandle");
    const view2dBtn = $("floatingView2dBtn");

    if (!panel) return;

    // Hide switcher button if disabled
    if (!showSwitcher && view2dBtn) {
      view2dBtn.style.display = "none";
    }

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        panel.classList.add("panel-hidden");
      });
    }

    // Collapse button
    const collapseBtn = $("floatingPanelCollapse");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        panel.classList.toggle("panel-collapsed");
        // Rotate the chevron icon
        const svg = collapseBtn.querySelector("svg");
        if (svg) {
          svg.style.transform = panel.classList.contains("panel-collapsed") ? "rotate(180deg)" : "";
        }
      });
    }

    // Accordion section toggles
    const accordionHeaders = panel.querySelectorAll(".accordion-header");
    accordionHeaders.forEach(header => {
      header.addEventListener("click", () => {
        const section = header.closest(".accordion-section");
        if (section) {
          section.classList.toggle("collapsed");
        }
      });
    });

    // 2D view button - pass current query params with embed=true
    if (view2dBtn) {
      view2dBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Build URL relative to current location
        const url2d = new URL("index.html", window.location.href);
        // Add current state params including 3D viewport for round-trip
        const currentParams = new URLSearchParams(location.search);
        const newParams = new URLSearchParams();

        // Copy relevant params - use CKGraph directly for source of truth
        if (CKGraph.loadedFromDataUrl && CKGraph.expandedIds.size === 0) {
          newParams.set("dataUrl", CKGraph.loadedFromDataUrl);
        } else {
          const allIds = Array.from(kittyById.keys()).sort((a, b) => a - b);
          if (allIds.length > 0) {
            newParams.set("kitties", allIds.join(","));
            newParams.set("noExpand", "true");
          }
        }

        // Copy filters
        if (generationHighlightActive) {
          if (generationRangeMin !== null) newParams.set("genMin", generationRangeMin);
          if (generationRangeMax !== null) newParams.set("genMax", generationRangeMax);
        }
        if (mewtationHighlightActive) {
          if (highlightedGemTypes.size === 0) {
            newParams.set("mewtations", "all");
          } else {
            newParams.set("mewtations", Array.from(highlightedGemTypes).join(","));
          }
        }
        if (selectedNodeId) newParams.set("selected", selectedNodeId);
        if (shortestPathMode) newParams.set("shortestPath", "true");
        if (lockedPathToId && selectedNodeId) {
          newParams.set("pathFrom", selectedNodeId);
          newParams.set("pathTo", lockedPathToId);
        }

        // Include 3D viewport for round-trip preservation
        if (graph) {
          const camPos = graph.cameraPosition();
          const camera = graph.camera();
          if (camPos && camera && camera.quaternion) {
            const q = camera.quaternion;
            newParams.set("cam3d", [
              camPos.x.toFixed(1), camPos.y.toFixed(1), camPos.z.toFixed(1),
              q.x.toFixed(4), q.y.toFixed(4), q.z.toFixed(4), q.w.toFixed(4),
              camera.zoom.toFixed(2)
            ].join("_"));
          }
        }

        // Include foreign 2D viewport if we have one from previous round-trip
        if (foreignCam2d) {
          newParams.set("cam2d", foreignCam2d);
        }

        // Preserve embed mode
        newParams.set("embed", "true");
        if (currentParams.get("switcher") === "false") {
          newParams.set("switcher", "false");
        }

        url2d.search = newParams.toString();
        window.location.href = url2d.href;
      });
    }

    // Make panel draggable
    if (dragHandle) {
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;

      dragHandle.addEventListener("mousedown", (e) => {
        // Don't start dragging if clicking on buttons
        if (e.target.closest(".panel-btn")) return;
        isDragging = true;
        const rect = panel.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        panel.style.transition = "none";
      });

      document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.clientX - dragOffsetX;
        const y = e.clientY - dragOffsetY;
        // Allow partial out-of-view but keep at least 50px visible
        const minVisible = 50;
        const minX = minVisible - panel.offsetWidth;
        const maxX = window.innerWidth - minVisible;
        const minY = minVisible - panel.offsetHeight;
        const maxY = window.innerHeight - minVisible;
        panel.style.left = Math.max(minX, Math.min(x, maxX)) + "px";
        panel.style.top = Math.max(minY, Math.min(y, maxY)) + "px";
        panel.style.right = "auto";
      });

      document.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          panel.style.transition = "";
        }
      });

      // Keep at least 50px of panel visible on window resize
      window.addEventListener("resize", () => {
        if (panel.style.right !== "auto") return; // Only adjust if manually positioned
        const rect = panel.getBoundingClientRect();
        const minVisible = 50;
        const minX = minVisible - panel.offsetWidth;
        const maxX = window.innerWidth - minVisible;
        const minY = minVisible - panel.offsetHeight;
        const maxY = window.innerHeight - minVisible;
        let needsUpdate = false;
        let newX = rect.left;
        let newY = rect.top;

        if (rect.left < minX) {
          newX = minX;
          needsUpdate = true;
        } else if (rect.left > maxX) {
          newX = maxX;
          needsUpdate = true;
        }
        if (rect.top < minY) {
          newY = minY;
          needsUpdate = true;
        } else if (rect.top > maxY) {
          newY = maxY;
          needsUpdate = true;
        }

        if (needsUpdate) {
          panel.style.left = newX + "px";
          panel.style.top = newY + "px";
        }
      });
    }

    // Set up GitHub link
    const floatingGithubLink = $("floatingGithubLink");
    if (floatingGithubLink) {
      const githubUrl = CK_GRAPH_DEFAULTS.githubUrl || "https://github.com/nivs/crypto-kitties-family-graph";
      floatingGithubLink.href = githubUrl;
    }

    // Set up "Open in viewer" link
    const floatingViewerLink = $("floatingViewerLink");
    if (floatingViewerLink) {
      floatingViewerLink.addEventListener("click", () => {
        // Build URL relative to current location
        const url = new URL("3d.html", window.location.href);
        const params = {};

        // Data params - use CKGraph directly for source of truth
        if (CKGraph.loadedFromDataUrl && CKGraph.expandedIds.size === 0) {
          params.dataUrl = CKGraph.loadedFromDataUrl;
        } else if (kittyById.size > 0) {
          params.kitties = Array.from(kittyById.keys()).sort((a, b) => a - b).join(",");
          params.noExpand = "true";
        }

        // Filter params
        if (generationRangeMin !== null) params.genMin = generationRangeMin;
        if (generationRangeMax !== null) params.genMax = generationRangeMax;
        if (mewtationHighlightActive) {
          params.mewtations = highlightedGemTypes.size === 0 ? "all" : Array.from(highlightedGemTypes).join(",");
        }

        // Selection/path params
        if (selectedNodeId) params.selected = selectedNodeId;
        if (shortestPathMode) params.shortestPath = "true";
        if (lockedPathToId && selectedNodeId) {
          params.pathFrom = selectedNodeId;
          params.pathTo = lockedPathToId;
        }

        // Camera state (compact format)
        if (graph) {
          const camPos = graph.cameraPosition();
          const camera = graph.camera();
          if (camPos && camera && camera.quaternion) {
            const q = camera.quaternion;
            params.cam3d = [
              camPos.x.toFixed(1),
              camPos.y.toFixed(1),
              camPos.z.toFixed(1),
              q.x.toFixed(4),
              q.y.toFixed(4),
              q.z.toFixed(4),
              q.w.toFixed(4),
              camera.zoom.toFixed(2)
            ].join("_");
          }
        }

        url.search = new URLSearchParams(params).toString();
        window.open(url.href, "_blank");
      });
    }
  }

  // ===================== FLOATING FILTERS PANEL (EMBED MODE) =====================
  function setupFloatingFiltersPanel() {
    // Wire up floating filter controls to main filter controls
    const floatingGenMin = $("floatingGenerationMin");
    const floatingGenMax = $("floatingGenerationMax");
    const mainGenMin = $("generationMin");
    const mainGenMax = $("generationMax");

    // Sync generation filters
    if (floatingGenMin && mainGenMin) {
      floatingGenMin.addEventListener("input", () => {
        mainGenMin.value = floatingGenMin.value;
        mainGenMin.dispatchEvent(new Event("input"));
      });
      mainGenMin.addEventListener("input", () => {
        floatingGenMin.value = mainGenMin.value;
      });
    }

    if (floatingGenMax && mainGenMax) {
      floatingGenMax.addEventListener("input", () => {
        mainGenMax.value = floatingGenMax.value;
        mainGenMax.dispatchEvent(new Event("input"));
      });
      mainGenMax.addEventListener("input", () => {
        floatingGenMax.value = mainGenMax.value;
      });
    }

    // Sync mewtation filter buttons
    ["All", "Diamond", "Gold", "Silver", "Bronze"].forEach(type => {
      const floatingBtn = $(`floatingMewtationFilter${type}`);
      const mainBtn = $(`mewtationFilter${type}`);
      if (floatingBtn && mainBtn) {
        floatingBtn.addEventListener("click", () => {
          mainBtn.click();
        });
        // Observe main button class changes to sync visual state
        const observer = new MutationObserver(() => {
          if (mainBtn.classList.contains("active")) {
            floatingBtn.classList.add("active");
          } else {
            floatingBtn.classList.remove("active");
          }
        });
        observer.observe(mainBtn, { attributes: true, attributeFilter: ["class"] });
      }
    });

    // Sync shortest path checkbox
    const floatingPathMode = $("floatingShortestPathMode");
    const mainPathMode = $("shortestPathMode");
    if (floatingPathMode && mainPathMode) {
      floatingPathMode.addEventListener("change", () => {
        mainPathMode.checked = floatingPathMode.checked;
        mainPathMode.dispatchEvent(new Event("change"));
      });
      mainPathMode.addEventListener("change", () => {
        floatingPathMode.checked = mainPathMode.checked;
      });
    }

    // Clear filters button
    const floatingClearBtn = $("floatingClearFiltersBtn");
    const mainClearBtn = $("clearFiltersBtn");
    if (floatingClearBtn && mainClearBtn) {
      floatingClearBtn.addEventListener("click", () => {
        mainClearBtn.click();
      });
    }

    // Sync Z-Axis selector
    const floatingZAxisSelect = $("floatingZAxisSelect");
    const mainZAxisSelect = $("zAxisSelect");
    if (floatingZAxisSelect && mainZAxisSelect) {
      floatingZAxisSelect.addEventListener("change", () => {
        mainZAxisSelect.value = floatingZAxisSelect.value;
        mainZAxisSelect.dispatchEvent(new Event("change"));
      });
      mainZAxisSelect.addEventListener("change", () => {
        floatingZAxisSelect.value = mainZAxisSelect.value;
      });
      // Sync initial value
      floatingZAxisSelect.value = mainZAxisSelect.value;
    }

    // Sync Settings checkboxes
    const floatingPrefetch = $("floatingPrefetchChildren");
    const mainPrefetch = $("prefetchChildren");
    if (floatingPrefetch && mainPrefetch) {
      floatingPrefetch.addEventListener("change", () => {
        mainPrefetch.checked = floatingPrefetch.checked;
        mainPrefetch.dispatchEvent(new Event("change"));
      });
      mainPrefetch.addEventListener("change", () => {
        floatingPrefetch.checked = mainPrefetch.checked;
      });
      floatingPrefetch.checked = mainPrefetch.checked;
    }

    const floatingAutoConnect = $("floatingAutoConnect");
    const mainAutoConnect = $("autoConnect");
    if (floatingAutoConnect && mainAutoConnect) {
      floatingAutoConnect.addEventListener("change", () => {
        mainAutoConnect.checked = floatingAutoConnect.checked;
        mainAutoConnect.dispatchEvent(new Event("change"));
      });
      mainAutoConnect.addEventListener("change", () => {
        floatingAutoConnect.checked = mainAutoConnect.checked;
      });
      floatingAutoConnect.checked = mainAutoConnect.checked;
    }
  }

  // ===================== GRAPH INITIALIZATION =====================
  function initGraph() {
    const container = $("graph-container");
    if (!container) return;

    // Prevent browser context menu on container to allow right-click panning
    container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    // Track mouse position for context menu
    document.addEventListener("mousemove", (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    graph = ForceGraph3D()(container)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .backgroundColor("#161b2b")
      .graphData(graphData)
      .nodeLabel(node => node.name)
      .nodeThreeObject(createNodeObject)
      .nodeColor(node => node.color)
      .nodeOpacity(getNodeOpacity)
      .linkWidth(2)
      .linkColor(link => link.color)
      .linkOpacity(getLinkOpacity)
      .linkCurvature(0.25)
      .onNodeClick((node, event) => {
        if (!node) {
          selectedNodeId = null;
          hideSelected();
          return;
        }

        // Detect double-click for expansion
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;
        const isDoubleClick = (timeSinceLastClick < DOUBLE_CLICK_THRESHOLD) && (lastClickNodeId === node.id);
        lastClickTime = now;
        lastClickNodeId = node.id;

        if (isDoubleClick) {
          // Double-click: expand family
          CKGraph.expandFamily(node.id);
          return;
        }

        if (shortestPathMode && selectedNodeId && node.id !== selectedNodeId) {
          lockedPathToId = node.id;
          highlightPath(selectedNodeId, node.id);
          return;
        }

        selectedNodeId = node.id;
        lockedPathToId = null;
        showSelected(node.id);
        graph.refresh();

        // Focus camera on selected node with proper kitty orientation (feet down, face front)
        const distance = 200;
        const camera = graph.camera();

        // Camera above node looking down, up=+Z for proper kitty orientation
        camera.up.set(0, 0, 1);
        graph.cameraPosition(
          { x: node.x, y: node.y + distance, z: node.z || 0 },
          node,
          1000
        );
      })
      .onNodeHover((node, prevNode) => {
        if (node) {
          showTooltip(node);
          if (shortestPathMode && selectedNodeId && node.id !== selectedNodeId) {
            highlightPath(selectedNodeId, node.id);
          }
        } else {
          hideTooltip();
          if (shortestPathMode && selectedNodeId && lockedPathToId) {
            highlightPath(selectedNodeId, lockedPathToId);
          } else {
            clearPathHighlight();
          }
        }
        container.style.cursor = node ? "pointer" : "default";
      })
      .onBackgroundClick(() => {
        selectedNodeId = null;
        lockedPathToId = null;
        hideSelected();
        clearPathHighlight();
        graph.refresh();
      })
      .onNodeRightClick((node) => {
        if (node) {
          // Use tracked mouse position since onNodeRightClick doesn't provide screen coordinates
          showContextMenu(node.id, { clientX: lastMouseX, clientY: lastMouseY });
        }
      });

    // Configure force simulation to increase node spacing
    graph.d3Force('link').distance(80); // Increase link distance from default ~30 to 80
    graph.d3Force('charge').strength(-120); // Increase repulsion from default -30 to -120

    // Allow full camera rotation (prevent gimbal lock at poles)
    const controls = graph.controls();
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    // Enable panning with right-click or Ctrl+left-click
    controls.enablePan = true;
    controls.screenSpacePanning = true; // Pan parallel to screen rather than ground plane
    controls.panSpeed = 1.0;

    // Set initial camera position and lookAt target
    // Set up vector first to ensure correct orientation
    const camera = graph.camera();
    camera.up.set(0, 1, 0);

    graph.cameraPosition(
      { x: -25, y: 487, z: 76 },  // position
      { x: 0, y: 0, z: 0 },       // lookAt target
      0                           // no animation
    );

    // Add lighting for shading
    const scene = graph.scene();

    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Directional light for shading
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 500, 300);
    scene.add(directionalLight);

    // Additional directional light from opposite side
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-200, -500, -300);
    scene.add(directionalLight2);

    // Initialize viewport gizmo
    initViewportGizmo();

    // Handle window resize - update graph dimensions
    window.addEventListener("resize", () => {
      if (graph && container) {
        graph.width(container.clientWidth);
        graph.height(container.clientHeight);
      }
    });

    log("Graph initialized");

    // Expose for console debugging
    window.graph3d = graph;
  }

  // ===================== VIEWPORT GIZMO =====================
  function initViewportGizmo() {
    if (!graph || !ViewportGizmo) return;

    try {
      const camera = graph.camera();
      const renderer = graph.renderer();
      const controls = graph.controls(); // Get existing OrbitControls from graph

      viewportGizmo = new ViewportGizmo(camera, renderer, {
        placement: "bottom-right",
        size: 100,
        lineWidth: 3,
        animated: true,
        speed: 2,
        background: {
          color: 0x12161e,
          opacity: 0.75,
          hover: {
            color: 0x1a1e2a,
            opacity: 0.85
          }
        }
      });

      // Attach to existing controls
      viewportGizmo.attachControls(controls);

      // Sync controls after gizmo animation completes
      viewportGizmo.addEventListener("end", () => {
        // Update the controls target to match gizmo's target
        controls.target.copy(viewportGizmo.target);
        // Force update to recalculate internal spherical coords from camera position
        controls.update();
      });

      // Render gizmo on each frame using requestAnimationFrame
      let rafId = null;
      const animate = () => {
        if (viewportGizmo) {
          viewportGizmo.render();
        }
        rafId = requestAnimationFrame(animate);
      };
      animate();

      // Update gizmo on window resize (use addEventListener to not interfere with graph resize)
      window.addEventListener("resize", () => {
        if (viewportGizmo) viewportGizmo.update();
      });

      log("Viewport gizmo initialized");

      // Return cleanup function (optional, for future use)
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        if (viewportGizmo && viewportGizmo.dispose) viewportGizmo.dispose();
      };
    } catch (e) {
      console.error("Failed to initialize viewport gizmo:", e);
    }
  }

  // ===================== TRAIT/GEM HIGHLIGHTING =====================
  function highlightByTrait(traitValue) {
    if (!traitValue) return;
    highlightedTraitGemNodes.clear();

    // Find all kitties with this trait value
    for (const node of graphData.nodes) {
      const traits = node.kitty.traits || {};
      for (const val of Object.values(traits)) {
        if (val && val.toLowerCase() === traitValue.toLowerCase()) {
          highlightedTraitGemNodes.add(node.id);
          break;
        }
      }
    }

    // Dim links not between highlighted nodes
    for (const link of graphData.links) {
      const srcId = typeof link.source === "object" ? link.source.id : link.source;
      const tgtId = typeof link.target === "object" ? link.target.id : link.target;
      const baseColor = link.type === "matron" ? "#ff5aa5" : "#4aa8ff";

      if (highlightedTraitGemNodes.has(srcId) && highlightedTraitGemNodes.has(tgtId)) {
        link.color = baseColor;
      } else {
        link.color = darkenColor(baseColor, 0.7);
      }
    }

    log("highlightByTrait:", { traitValue, count: highlightedTraitGemNodes.size });

    // Refresh graph to recreate nodes with highlighting
    if (graph) graph.refresh();
  }

  function highlightByGemType(gemType) {
    if (!gemType) return;
    highlightedTraitGemNodes.clear();

    // Find all kitties with this gem type
    for (const node of graphData.nodes) {
      const gems = getMewtationGems(node.kitty);
      if (gems.some(g => g.gem === gemType)) {
        highlightedTraitGemNodes.add(node.id);
      }
    }

    // Dim links not between highlighted nodes
    for (const link of graphData.links) {
      const srcId = typeof link.source === "object" ? link.source.id : link.source;
      const tgtId = typeof link.target === "object" ? link.target.id : link.target;
      const baseColor = link.type === "matron" ? "#ff5aa5" : "#4aa8ff";

      if (highlightedTraitGemNodes.has(srcId) && highlightedTraitGemNodes.has(tgtId)) {
        link.color = baseColor;
      } else {
        link.color = darkenColor(baseColor, 0.7);
      }
    }

    log("highlightByGemType:", { gemType, count: highlightedTraitGemNodes.size });

    // Refresh graph to recreate nodes with highlighting
    if (graph) graph.refresh();
  }

  function clearTraitGemHighlight() {
    highlightedTraitGemNodes.clear();

    // Restore link colors
    for (const link of graphData.links) {
      link.color = link.type === "matron" ? "#ff5aa5" : "#4aa8ff";
    }

    // Refresh graph to recreate nodes without highlighting
    if (graph) graph.refresh();
  }

  // ===================== PATH HIGHLIGHTING =====================

  function highlightPath(fromId, toId) {
    const path = CKGraph.findShortestPath(fromId, toId);
    highlightedPath = new Set(path);

    // Find links in path
    highlightedPathLinks = new Set();
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      for (const link of graphData.links) {
        const srcId = typeof link.source === "object" ? link.source.id : link.source;
        const tgtId = typeof link.target === "object" ? link.target.id : link.target;
        if ((srcId === a && tgtId === b) || (srcId === b && tgtId === a)) {
          highlightedPathLinks.add(link);
        }
      }
    }

    // Update link colors for path
    graph.linkColor(link => {
      if (highlightedPathLinks.has(link)) {
        return link.type === "matron" ? "#ff40a0" : "#40a0ff";
      }
      return highlightedPath.size > 0 ? darkenColor(link.color, 0.6) : link.color;
    });

    graph.linkWidth(link => highlightedPathLinks.has(link) ? 4 : 2);
    graph.refresh();
  }

  function clearPathHighlight() {
    highlightedPath = new Set();
    highlightedPathLinks = new Set();
    graph.linkColor(link => link.color);
    graph.linkWidth(2);
    graph.refresh();
  }

  // ===================== DATA LOADING =====================
  // Data loading functions are in base.js (CKGraph.loadKittiesById, etc.)
  // The CKGraph.onDataLoaded callback handles 3D-specific graph rebuilding

  function setStats() {
    if (statsPill) statsPill.textContent = `${graphData.nodes.length} nodes, ${graphData.links.length} edges`;
  }

  // ===================== Z-AXIS UPDATE =====================
  function updateZAxis() {
    // Rebuild graph data with new Z positions
    graphData = buildGraphData();
    if (graph) {
      graph.graphData(graphData);
    }
  }

  // ===================== FILTER UPDATES =====================
  function applyFilters() {
    if (graph) {
      graph.nodeOpacity(getNodeOpacity);
      graph.linkOpacity(getLinkOpacity);
      graph.refresh();
    }
  }

  // ===================== PERMALINK GENERATION =====================
  // loadedFromDataUrl and foreignCam2d are declared at the top of the file

  function generatePermalinkUrl(basePath = "", includeViewport = true) {
    const base = basePath || (window.location.origin + window.location.pathname);
    let url;

    // Use CKGraph directly for source of truth
    if (CKGraph.loadedFromDataUrl && CKGraph.expandedIds.size === 0) {
      url = `${base}?dataUrl=${encodeURIComponent(CKGraph.loadedFromDataUrl)}`;
    } else {
      const allIds = Array.from(kittyById.keys()).sort((a, b) => a - b);
      if (allIds.length === 0) return base;
      url = `${base}?kitties=${allIds.join(",")}&noExpand=true`;
    }

    if (generationHighlightActive) {
      if (generationRangeMin !== null) url += `&genMin=${generationRangeMin}`;
      if (generationRangeMax !== null) url += `&genMax=${generationRangeMax}`;
    }

    if (mewtationHighlightActive) {
      if (highlightedGemTypes.size === 0) {
        url += `&mewtations=all`;
      } else {
        url += `&mewtations=${Array.from(highlightedGemTypes).join(",")}`;
      }
    }

    if (selectedNodeId) url += `&selected=${selectedNodeId}`;
    if (shortestPathMode) url += `&shortestPath=true`;
    if (lockedPathToId && selectedNodeId) {
      url += `&pathFrom=${selectedNodeId}&pathTo=${lockedPathToId}`;
    }

    // Add camera state as single compact parameter - only for same viewer type
    // Format: cam3d=posX_posY_posZ_quatX_quatY_quatZ_quatW_zoom
    if (includeViewport && graph) {
      const camPos = graph.cameraPosition();
      const camera = graph.camera();
      if (camPos && camera && camera.quaternion) {
        const q = camera.quaternion;
        const camState = [
          camPos.x.toFixed(1),
          camPos.y.toFixed(1),
          camPos.z.toFixed(1),
          q.x.toFixed(4),
          q.y.toFixed(4),
          q.z.toFixed(4),
          q.w.toFixed(4),
          camera.zoom.toFixed(2)
        ].join("_");
        url += `&cam3d=${camState}`;
      }
    }

    // Include foreign 2D viewport for round-trip preservation
    if (foreignCam2d) {
      url += `&cam2d=${foreignCam2d}`;
    }

    return url;
  }

  // ===================== CONTROLS WIRING =====================
  function wireControls() {
    // Load kitty by ID(s)
    const kittyIdInput = $("kittyIdInput");
    const loadKittyBtn = $("loadKittyBtn");
    const addKittyBtn = $("addKittyBtn");
    if (kittyIdInput) {
      const doLoadKitties = async () => {
        const ids = kittyIdInput.value.split(/[,\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => n && !isNaN(n));
        if (!ids.length) { setStatus("Enter valid kitty ID(s)", true); return; }
        await CKGraph.loadKittiesById(ids);
      };

      const doAddKitties = async () => {
        const ids = kittyIdInput.value.split(/[,\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => n && !isNaN(n));
        if (!ids.length) { setStatus("Enter valid kitty ID(s)", true); return; }
        await CKGraph.addKittiesById(ids);
      };

      if (loadKittyBtn) {
        loadKittyBtn.addEventListener("click", doLoadKitties);
      }

      if (addKittyBtn) {
        addKittyBtn.addEventListener("click", doAddKitties);
      }

      kittyIdInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") doLoadKitties();
      });
    }

    // JSON loading: URL or file picker
    const jsonBtn = $("loadJsonBtn");
    const jsonInput = $("jsonUrl");
    const jsonFilePicker = $("jsonFilePicker");

    if (jsonBtn && jsonInput && jsonFilePicker) {
      jsonBtn.addEventListener("click", async () => {
        const url = jsonInput.value.trim();
        if (url) {
          // Load from URL
          try { await CKGraph.loadJsonFromUrl(url); }
          catch (e) { console.error(e); setStatus("Failed to load JSON URL", true); }
        } else {
          // Open file picker
          jsonFilePicker.click();
        }
      });

      // Handle file selection
      jsonFilePicker.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          log("load from file:", file.name, file.size);
          CKGraph.loadedFromDataUrl = null;
          const text = await file.text();
          const data = JSON.parse(text);
          CKGraph.loadJsonObject(data);
          jsonFilePicker.value = ""; // Reset for re-selection
        } catch (err) {
          console.error(err);
          setStatus("Failed to load JSON file", true);
        }
      });

      // Drag-and-drop support
      jsonInput.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        jsonInput.classList.add("drag-over");
      });

      jsonInput.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        jsonInput.classList.remove("drag-over");
      });

      jsonInput.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        jsonInput.classList.remove("drag-over");

        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file) return;
        if (!file.name.endsWith(".json")) {
          setStatus("Please drop a JSON file", true);
          return;
        }

        try {
          log("load from dropped file:", file.name, file.size);
          CKGraph.loadedFromDataUrl = null;
          const text = await file.text();
          const data = JSON.parse(text);
          CKGraph.loadJsonObject(data);
        } catch (err) {
          console.error(err);
          setStatus("Failed to load dropped JSON file", true);
        }
      });
    }

    // Z-axis selector
    const zAxisSelect = $("zAxisSelect");
    if (zAxisSelect) {
      zAxisSelect.addEventListener("change", () => {
        zAxisMode = zAxisSelect.value;
        updateZAxis();
        log("Z-axis mode:", zAxisMode);
      });
    }

    // Generation filter
    const genMinInput = $("generationMin");
    const genMaxInput = $("generationMax");
    const applyGenFilter = () => {
      const minVal = genMinInput ? genMinInput.value : "";
      const maxVal = genMaxInput ? genMaxInput.value : "";

      if (minVal === "" && maxVal === "") {
        generationHighlightActive = false;
        generationRangeMin = null;
        generationRangeMax = null;
      } else {
        generationHighlightActive = true;
        generationRangeMin = minVal !== "" ? Number(minVal) : null;
        generationRangeMax = maxVal !== "" ? Number(maxVal) : null;
      }
      applyFilters();
    };
    if (genMinInput) genMinInput.addEventListener("input", applyGenFilter);
    if (genMaxInput) genMaxInput.addEventListener("input", applyGenFilter);

    // Mewtation filter buttons
    const mewtationBtns = {
      all: $("mewtationFilterAll"),
      diamond: $("mewtationFilterDiamond"),
      gold: $("mewtationFilterGold"),
      silver: $("mewtationFilterSilver"),
      bronze: $("mewtationFilterBronze")
    };

    const clearMewtationBtns = () => {
      Object.values(mewtationBtns).forEach(btn => btn && btn.classList.remove("active"));
    };

    if (mewtationBtns.all) {
      mewtationBtns.all.addEventListener("click", () => {
        if (mewtationBtns.all.classList.contains("active")) {
          clearMewtationBtns();
          mewtationHighlightActive = false;
          highlightedGemTypes.clear();
        } else {
          clearMewtationBtns();
          mewtationBtns.all.classList.add("active");
          mewtationHighlightActive = true;
          highlightedGemTypes = new Set();
        }
        applyFilters();
      });
    }

    ["diamond", "gold", "silver", "bronze"].forEach(gemType => {
      const btn = mewtationBtns[gemType];
      if (btn) {
        btn.addEventListener("click", () => {
          if (btn.classList.contains("active")) {
            btn.classList.remove("active");
            highlightedGemTypes.delete(gemType);
            if (highlightedGemTypes.size === 0) {
              mewtationHighlightActive = false;
            }
          } else {
            mewtationBtns.all && mewtationBtns.all.classList.remove("active");
            btn.classList.add("active");
            highlightedGemTypes.add(gemType);
            mewtationHighlightActive = true;
          }
          applyFilters();
        });
      }
    });

    // Clear filters button
    const clearFiltersBtn = $("clearFiltersBtn");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        // Clear generation filters
        generationHighlightActive = false;
        generationRangeMin = null;
        generationRangeMax = null;
        const genMinInput = $("generationMin");
        const genMaxInput = $("generationMax");
        if (genMinInput) genMinInput.value = "";
        if (genMaxInput) genMaxInput.value = "";

        // Clear mewtation filters
        mewtationHighlightActive = false;
        highlightedGemTypes.clear();
        clearMewtationBtns();

        // Clear shortest path
        shortestPathMode = false;
        const shortestPathToggle = $("shortestPathMode");
        if (shortestPathToggle) shortestPathToggle.checked = false;
        lockedPathToId = null;
        clearPathHighlight();

        applyFilters();
        log("All filters cleared");
      });
    }

    // Shortest path mode
    const shortestPathToggle = $("shortestPathMode");
    if (shortestPathToggle) {
      shortestPathToggle.addEventListener("change", () => {
        shortestPathMode = shortestPathToggle.checked;
        if (!shortestPathMode) {
          lockedPathToId = null;
          clearPathHighlight();
        }
        log("Shortest path mode:", shortestPathMode);
      });
    }

    // Settings panel toggle
    const settingsToggle = $("settingsToggle");
    const settingsBody = $("settingsBody");
    if (settingsToggle && settingsBody) {
      settingsToggle.addEventListener("click", () => {
        const collapsed = settingsToggle.classList.toggle("collapsed");
        settingsBody.style.display = collapsed ? "none" : "block";
      });
    }

    // Examples panel toggle
    const examplesToggle = $("examplesToggle");
    const examplesBody = $("examplesBody");
    if (examplesToggle && examplesBody) {
      examplesToggle.addEventListener("click", () => {
        const collapsed = examplesToggle.classList.toggle("collapsed");
        examplesBody.style.display = collapsed ? "none" : "block";
      });
    }

    // Selected Kitty panel toggle
    const selectedToggle = $("selectedToggle");
    const selectedBody = $("selectedBody");
    if (selectedToggle && selectedBody) {
      selectedToggle.addEventListener("click", () => {
        const collapsed = selectedToggle.classList.toggle("collapsed");
        selectedBody.style.display = collapsed ? "none" : "block";
      });
    }

    // Z-Axis panel toggle
    const zAxisToggle = $("zAxisToggle");
    const zAxisBody = $("zAxisBody");
    if (zAxisToggle && zAxisBody) {
      zAxisToggle.addEventListener("click", () => {
        const collapsed = zAxisToggle.classList.toggle("collapsed");
        zAxisBody.style.display = collapsed ? "none" : "block";
      });
    }

    // Filters panel toggle
    const filtersToggle = $("filtersToggle");
    const filtersBody = $("filtersBody");
    if (filtersToggle && filtersBody) {
      filtersToggle.addEventListener("click", () => {
        const collapsed = filtersToggle.classList.toggle("collapsed");
        filtersBody.style.display = collapsed ? "none" : "block";
      });
    }

    // 2D view button - pass current query params to index.html
    const view2dBtn = $("view2dBtn");
    if (view2dBtn) {
      view2dBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const url2d = generatePermalinkUrl(window.location.origin + "/index.html", true); // Include 3D viewport for round-trip
        window.location.href = url2d;
      });
    }

    // Permalink button
    const permalinkBtn = $("permalinkBtn");
    if (permalinkBtn) {
      permalinkBtn.addEventListener("click", () => {
        const url = generatePermalinkUrl();
        navigator.clipboard.writeText(url).then(() => {
          setStatus("Permalink copied to clipboard", false);
        }).catch(() => {
          // Fallback: show URL in prompt
          window.prompt("Copy this permalink:", url);
        });
      });
    }

    // Embed button - show embed code modal
    const embedBtn = $("embedBtn");
    const embedModal = $("embedModal");
    const embedModalClose = $("embedModalClose");
    const embedViewer = $("embedViewer");
    const embedSwitcher = $("embedSwitcher");
    const embedViewport = $("embedViewport");
    const embedWidth = $("embedWidth");
    const embedHeight = $("embedHeight");
    const embedCodeOutput = $("embedCodeOutput");
    const embedCopyBtn = $("embedCopyBtn");

    if (embedBtn && embedModal) {
      embedBtn.addEventListener("click", () => {
        generateEmbedCode();
        embedModal.classList.add("show");
      });

      // Close modal
      if (embedModalClose) {
        embedModalClose.addEventListener("click", () => {
          embedModal.classList.remove("show");
        });
      }

      // Close on background click
      embedModal.addEventListener("click", (e) => {
        if (e.target === embedModal) {
          embedModal.classList.remove("show");
        }
      });

      // Update embed code when options change
      if (embedViewer) embedViewer.addEventListener("change", generateEmbedCode);
      if (embedSwitcher) embedSwitcher.addEventListener("change", generateEmbedCode);
      if (embedViewport) embedViewport.addEventListener("change", generateEmbedCode);
      if (embedWidth) embedWidth.addEventListener("input", generateEmbedCode);
      if (embedHeight) embedHeight.addEventListener("input", generateEmbedCode);

      // Copy button
      if (embedCopyBtn && embedCodeOutput) {
        embedCopyBtn.addEventListener("click", () => {
          embedCodeOutput.select();
          navigator.clipboard.writeText(embedCodeOutput.value).then(() => {
            embedCopyBtn.textContent = "Copied!";
            setTimeout(() => {
              embedCopyBtn.textContent = "Copy to Clipboard";
            }, 2000);
          }).catch(() => {
            // Fallback
            embedCodeOutput.select();
            document.execCommand("copy");
          });
        });
      }
    }

    function generateEmbedCode() {
      const viewer = embedViewer.value;
      const showSwitcher = embedSwitcher.checked;
      const preserveViewport = embedViewport ? embedViewport.checked : false;
      const width = embedWidth.value.trim();
      const height = embedHeight.value.trim();

      // Get current URL and modify it for embed mode
      // Only include viewport params if generating for same viewer type
      const includeViewport = viewer === "3d";
      let embedUrl = generatePermalinkUrl(window.location.origin + (viewer === "3d" ? "/3d.html" : "/index.html"), includeViewport);

      // Add embed=true parameter
      const url = new URL(embedUrl);
      url.searchParams.set("embed", "true");

      // Add switcher parameter if disabled
      if (!showSwitcher) {
        url.searchParams.set("switcher", "false");
      }

      // Remove viewport parameters if not preserving
      if (!preserveViewport) {
        url.searchParams.delete("cam3d");
      }

      // Note: For 2D viewport from 3D viewer, we can't preserve since we don't have 2D camera data
      // User will need to switch to 2D and generate embed from there

      embedUrl = url.toString();

      // Generate iframe code with optional width/height
      let iframeCode = `<iframe src="${embedUrl}"`;
      if (width) iframeCode += ` width="${width}"`;
      if (height) iframeCode += ` height="${height}"`;
      iframeCode += ` frameborder="0" allowfullscreen></iframe>`;

      if (embedCodeOutput) {
        embedCodeOutput.value = iframeCode;
      }
    }

    // ===================== KEYBOARD CONTROLS =====================
    // Track orientation interaction for hint system
    let orientationStartTime = null;
    let hintShown = false;
    const HINT_DELAY = 8000; // Show hint after 8 seconds of continuous interaction

    const showKeyboardHint = () => {
      // Allow re-showing with H key (hintShown only blocks auto-hint)
      setStatus(
        "Keys: WASD=pan, R/F=up/down, Q/E=roll, Z/X=spin, Arrows=orbit, +/-=zoom, Space=reset, C=center, V=flip",
        false
      );
      hintShown = true;
    };

    // Track mouse interaction for hint
    let lastInteractionTime = 0;
    document.addEventListener("mousedown", () => {
      if (!orientationStartTime) orientationStartTime = Date.now();
      lastInteractionTime = Date.now();
    });
    document.addEventListener("mouseup", () => {
      if (orientationStartTime && !hintShown) {
        const elapsed = Date.now() - orientationStartTime;
        if (elapsed > HINT_DELAY) {
          showKeyboardHint();
        }
      }
      orientationStartTime = null;
    });
    document.addEventListener("mousemove", (e) => {
      if (e.buttons > 0 && orientationStartTime && !hintShown) {
        const elapsed = Date.now() - orientationStartTime;
        if (elapsed > HINT_DELAY) {
          showKeyboardHint();
        }
      }
    });

    // Keyboard event handler
    document.addEventListener("keydown", (e) => {
      // Ignore if typing in an input field
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      // ESC - close modals, disable modes
      if (e.key === "Escape") {
        const embedModal = $("embedModal");
        if (embedModal && embedModal.classList.contains("show")) {
          embedModal.classList.remove("show");
          return;
        }
        if (shortestPathMode) {
          shortestPathMode = false;
          lockedPathToId = null;
          const spToggle = $("shortestPathMode");
          if (spToggle) spToggle.checked = false;
          clearPathHighlight();
          if (graph) graph.refresh();
        }
        if (document.activeElement) document.activeElement.blur();
        return;
      }

      if (!graph) return;

      const camera = graph.camera();
      const controls = graph.controls();
      const panAmount = 20;
      const rotateAmount = 0.05;
      const zoomAmount = 0.1;

      // H - show help
      if (e.key === "h" || e.key === "H") {
        showKeyboardHint();
        return;
      }

      // === STANDARD KEYBOARD NAV SCHEME ===
      // WASD: pan, R/F: up/down, Q/E: roll, Arrows: pitch/yaw
      //
      // Previous implementation (orbit-centric):
      // - WASD: orbit around target (W/S vertical, A/D horizontal)
      // - Arrows: pan camera and target together
      // - R/F: zoom in/out (move toward/away from target)

      // WASD - Pan camera (move camera and target together)
      if (e.key === "w" || e.key === "W") {
        // Pan forward in camera view direction (projected onto XZ plane)
        const viewDir = new THREE.Vector3();
        camera.getWorldDirection(viewDir);
        viewDir.y = 0; // Project onto horizontal plane
        viewDir.normalize();
        if (viewDir.length() > 0.01) {
          camera.position.addScaledVector(viewDir, panAmount);
          controls.target.addScaledVector(viewDir, panAmount);
        }
        controls.update();
        return;
      }
      if (e.key === "s" || e.key === "S") {
        // Pan backward
        const viewDir = new THREE.Vector3();
        camera.getWorldDirection(viewDir);
        viewDir.y = 0;
        viewDir.normalize();
        if (viewDir.length() > 0.01) {
          camera.position.addScaledVector(viewDir, -panAmount);
          controls.target.addScaledVector(viewDir, -panAmount);
        }
        controls.update();
        return;
      }
      if (e.key === "a" || e.key === "A") {
        // Strafe left
        const right = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.cross(camera.up).normalize();
        camera.position.addScaledVector(right, -panAmount);
        controls.target.addScaledVector(right, -panAmount);
        controls.update();
        return;
      }
      if (e.key === "d" || e.key === "D") {
        // Strafe right
        const right = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.cross(camera.up).normalize();
        camera.position.addScaledVector(right, panAmount);
        controls.target.addScaledVector(right, panAmount);
        controls.update();
        return;
      }

      // R/F - Move up/down (vertical pan)
      if (e.key === "r" || e.key === "R") {
        camera.position.y += panAmount;
        controls.target.y += panAmount;
        controls.update();
        return;
      }
      if (e.key === "f" || e.key === "F") {
        camera.position.y -= panAmount;
        controls.target.y -= panAmount;
        controls.update();
        return;
      }

      // Q/E - roll camera (rotate around view axis)
      if (e.key === "q" || e.key === "Q" || e.key === "e" || e.key === "E") {
        const rollAmount = 0.05;
        const direction = (e.key === "q" || e.key === "Q") ? 1 : -1;
        const viewDir = new THREE.Vector3();
        camera.getWorldDirection(viewDir);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(viewDir, rollAmount * direction);
        camera.up.applyQuaternion(quaternion);
        camera.up.normalize();
        controls.update();
        return;
      }

      // Arrow keys - Orbit around target
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        // Pitch - rotate around camera's right axis (like Z/X but horizontal)
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);

        // Use camera's current up to find right axis (stable through full rotation)
        const right = new THREE.Vector3().crossVectors(camera.up, offset).normalize();

        const direction = e.key === "ArrowUp" ? 1 : -1;
        offset.applyAxisAngle(right, rotateAmount * direction);
        camera.position.copy(controls.target).add(offset);

        // Also rotate the up vector to maintain orientation
        camera.up.applyAxisAngle(right, rotateAmount * direction);
        camera.up.normalize();

        camera.lookAt(controls.target);
        controls.update();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // Yaw - rotate around camera's up axis
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);

        const direction = e.key === "ArrowLeft" ? 1 : -1;
        offset.applyAxisAngle(camera.up, rotateAmount * direction);
        camera.position.copy(controls.target).add(offset);

        camera.lookAt(controls.target);
        controls.update();
        return;
      }

      // +/- or =/- - Zoom in/out (move toward/away from target)
      if (e.key === "+" || e.key === "=") {
        const viewDir = new THREE.Vector3();
        camera.getWorldDirection(viewDir);
        camera.position.addScaledVector(viewDir, panAmount);
        controls.update();
        return;
      }
      if (e.key === "-" || e.key === "_") {
        const viewDir = new THREE.Vector3();
        camera.getWorldDirection(viewDir);
        camera.position.addScaledVector(viewDir, -panAmount);
        controls.update();
        return;
      }

      // Z/X - rotate around world Z axis (spin the view)
      if (e.key === "z" || e.key === "Z" || e.key === "x" || e.key === "X") {
        const direction = (e.key === "z" || e.key === "Z") ? 1 : -1;
        const zAxis = new THREE.Vector3(0, 0, 1);

        // Rotate camera position around Z axis
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        offset.applyAxisAngle(zAxis, rotateAmount * direction);
        camera.position.copy(controls.target).add(offset);

        // Also rotate the up vector to maintain orientation
        camera.up.applyAxisAngle(zAxis, rotateAmount * direction);
        camera.up.normalize();

        camera.lookAt(controls.target);
        controls.update();
        return;
      }

      // Space - reset camera to default position
      if (e.key === " ") {
        e.preventDefault();
        camera.up.set(0, 1, 0);
        camera.position.set(-25, 487, 76);
        controls.target.set(0, 0, 0);
        camera.lookAt(controls.target);
        controls.update();
        setStatus("Camera reset to default", false);
        return;
      }

      // C - center on selected node with proper kitty orientation
      if (e.key === "c" || e.key === "C") {
        if (!selectedNodeId) {
          setStatus("No kitty selected - click a node first", false);
          return;
        }
        const node = graphData.nodes.find(n => n.id === selectedNodeId);
        if (node && node.x !== undefined) {
          const distance = 200;

          // Camera above node looking down, up=+Z for proper kitty orientation
          camera.up.set(0, 0, 1);
          graph.cameraPosition(
            { x: node.x, y: node.y + distance, z: node.z || 0 },
            node,
            1000
          );
          setStatus("Centered on kitty", false);
        }
        return;
      }

      // V - flip view (invert up vector)
      if (e.key === "v" || e.key === "V") {
        camera.up.negate();
        controls.update();
        return;
      }
    });
  }

  // ===================== INITIALIZATION =====================
  let pendingSelectedId = null;
  let pendingPathFrom = null;
  let pendingPathTo = null;
  let pendingCameraPos = null;

  function parseQueryParams() {
    const params = new URLSearchParams(location.search);
    let dataLoaded = false;

    // Save pending selection/path params
    const selectedParam = params.get("selected");
    if (selectedParam) pendingSelectedId = Number(selectedParam);

    const shortestPathParam = params.get("shortestPath");
    if (shortestPathParam === "true") {
      shortestPathMode = true;
      const toggle = $("shortestPathMode");
      if (toggle) toggle.checked = true;
    }

    const pathFromParam = params.get("pathFrom");
    const pathToParam = params.get("pathTo");
    if (pathFromParam) pendingPathFrom = Number(pathFromParam);
    if (pathToParam) pendingPathTo = Number(pathToParam);

    // Camera state param (compact format: cam3d=posX_posY_posZ_quatX_quatY_quatZ_quatW_zoom)
    // Validate to prevent malicious or malformed input
    const cam3dParam = params.get("cam3d");
    pendingCameraPos = null;
    if (cam3dParam && cam3dParam.length < 200) { // Sanity check on length
      const parts = cam3dParam.split("_").map(s => {
        const n = parseFloat(s);
        // Check for NaN, Infinity, and clamp to reasonable bounds
        if (!Number.isFinite(n)) return null;
        return Math.max(-100000, Math.min(100000, n));
      });

      // Validate we have valid numbers
      if (parts.length >= 3 && parts.slice(0, 3).every(n => n !== null)) {
        pendingCameraPos = {
          x: parts[0],
          y: parts[1],
          z: parts[2]
        };
        // Quaternion (should be unit quaternion, clamp components to [-1, 1])
        if (parts.length >= 7 && parts.slice(3, 7).every(n => n !== null)) {
          pendingCameraPos.quatX = Math.max(-1, Math.min(1, parts[3]));
          pendingCameraPos.quatY = Math.max(-1, Math.min(1, parts[4]));
          pendingCameraPos.quatZ = Math.max(-1, Math.min(1, parts[5]));
          pendingCameraPos.quatW = Math.max(-1, Math.min(1, parts[6]));
        }
        // Zoom (should be positive, reasonable range)
        if (parts.length >= 8 && parts[7] !== null) {
          pendingCameraPos.zoom = Math.max(0.01, Math.min(100, parts[7]));
        }
      }
    }

    // Store foreign 2D viewport param for round-trip preservation when switching back
    const cam2dParam = params.get("cam2d");
    if (cam2dParam && cam2dParam.length < 100) {
      foreignCam2d = cam2dParam;
    }

    // Generation filter
    const genMinParam = params.get("genMin");
    const genMaxParam = params.get("genMax");
    if (genMinParam || genMaxParam) {
      generationHighlightActive = true;
      generationRangeMin = genMinParam ? Number(genMinParam) : null;
      generationRangeMax = genMaxParam ? Number(genMaxParam) : null;
      const genMinInput = $("generationMin");
      const genMaxInput = $("generationMax");
      if (genMinInput && genMinParam) genMinInput.value = genMinParam;
      if (genMaxInput && genMaxParam) genMaxInput.value = genMaxParam;
    }

    // Mewtation filter
    const mewtationsParam = params.get("mewtations");
    if (mewtationsParam) {
      mewtationHighlightActive = true;
      if (mewtationsParam === "all") {
        highlightedGemTypes = new Set();
        const allBtn = $("mewtationFilterAll");
        if (allBtn) allBtn.classList.add("active");
      } else {
        const types = mewtationsParam.split(",").map(s => s.trim().toLowerCase());
        highlightedGemTypes = new Set(types);
        types.forEach(t => {
          const btn = $(`mewtationFilter${t.charAt(0).toUpperCase() + t.slice(1)}`);
          if (btn) btn.classList.add("active");
        });
      }
    }

    // Examples panel auto-open
    const examplesParam = params.get("examples");
    if (examplesParam === "open") {
      const examplesToggle = $("examplesToggle");
      const examplesBody = $("examplesBody");
      if (examplesToggle && examplesBody) {
        examplesToggle.classList.remove("collapsed");
        examplesBody.style.display = "block";
      }
    }

    // Z-axis mode
    const zAxisParam = params.get("zAxis");
    if (zAxisParam && ["generation", "birthday", "rarity", "flat"].includes(zAxisParam)) {
      zAxisMode = zAxisParam;
      const zAxisSelect = $("zAxisSelect");
      if (zAxisSelect) zAxisSelect.value = zAxisParam;
    }

    // Check for kitty IDs
    const kittyParam = params.get("kitty") || params.get("kitties");
    if (kittyParam) {
      const ids = kittyParam.split(/[,\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => n && !isNaN(n));
      if (ids.length > 0) {
        const noExpand = params.get("noExpand") === "true";
        CKGraph.loadKittiesById(ids, noExpand).then(applyPendingSelections);
        dataLoaded = true;
      }
    }

    // Check for dataUrl
    const dataUrl = params.get("dataUrl");
    if (!dataLoaded && dataUrl) {
      CKGraph.loadJsonFromUrl(dataUrl).then(applyPendingSelections).catch(e => {
        console.error(e);
        setStatus("Failed to load JSON from URL", true);
      });
      dataLoaded = true;
    }

    return dataLoaded;
  }

  function applyPendingSelections() {
    // Apply pending selection
    if (pendingSelectedId && kittyById.has(pendingSelectedId)) {
      selectedNodeId = pendingSelectedId;
      showSelected(pendingSelectedId);

      // Focus camera on selected node after a short delay (unless custom camera position is set)
      if (!pendingCameraPos) {
        setTimeout(() => {
          const node = graphData.nodes.find(n => n.id === pendingSelectedId);
          if (node && graph) {
            const currentCamPos = graph.cameraPosition();
            const distance = 200;

            // Calculate direction from node to current camera
            const dx = currentCamPos.x - (node.x || 0);
            const dy = currentCamPos.y - (node.y || 0);
            const dz = currentCamPos.z - (node.z || 0);
            const currentDist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            // Normalize direction and scale to desired distance
            const scale = distance / currentDist;

            // Set camera up vector to prevent upside-down orientation
            const camera = graph.camera();
            camera.up.set(0, 1, 0);

            graph.cameraPosition(
              { x: (node.x || 0) + dx * scale, y: (node.y || 0) + dy * scale, z: (node.z || 0) + dz * scale },
              node,
              1000
            );
          }
        }, 500);
      }
    }

    // Apply pending path highlight
    if (pendingPathFrom && pendingPathTo) {
      shortestPathMode = true;
      selectedNodeId = pendingPathFrom;
      lockedPathToId = pendingPathTo;
      const toggle = $("shortestPathMode");
      if (toggle) toggle.checked = true;
      setTimeout(() => {
        highlightPath(pendingPathFrom, pendingPathTo);
        showSelected(pendingPathFrom);
      }, 600);
    }

    // Apply pending camera position if set (after selection/path to allow animation)
    if (pendingCameraPos && graph) {
      setTimeout(() => {
        const camera = graph.camera();
        const controls = graph.controls();

        // Apply zoom if provided
        if (pendingCameraPos.zoom !== undefined) {
          camera.zoom = pendingCameraPos.zoom;
          camera.updateProjectionMatrix();
        }

        // Set camera position
        camera.position.set(pendingCameraPos.x, pendingCameraPos.y, pendingCameraPos.z);

        // Apply quaternion if provided (this fully defines orientation including roll)
        if (pendingCameraPos.quatW !== undefined) {
          const quat = new THREE.Quaternion(
            pendingCameraPos.quatX,
            pendingCameraPos.quatY,
            pendingCameraPos.quatZ,
            pendingCameraPos.quatW
          );
          camera.quaternion.copy(quat);

          // Derive up vector from quaternion (transform local Y by quaternion)
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
          camera.up.copy(up);
        }

        // Set controls target to selected node if we have one
        if (pendingSelectedId) {
          const node = graphData.nodes.find(n => n.id === pendingSelectedId);
          if (node && node.x !== undefined) {
            controls.target.set(node.x, node.y, node.z);
          }
        }

        log("Camera position from query params:", pendingCameraPos);

        // Update controls without letting it override our orientation
        requestAnimationFrame(() => {
          if (pendingCameraPos.quatW !== undefined) {
            const quat = new THREE.Quaternion(
              pendingCameraPos.quatX,
              pendingCameraPos.quatY,
              pendingCameraPos.quatZ,
              pendingCameraPos.quatW
            );
            camera.quaternion.copy(quat);
            camera.up.set(0, 1, 0).applyQuaternion(quat);
          }
        });
      }, 700);
    }

    // Apply filters after data is loaded
    applyFilters();
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Embed mode setup
    const params = new URLSearchParams(location.search);
    const isEmbedMode = params.get("embed") === "true" || params.get("embed") === "1";
    const showSwitcher = params.get("switcher") !== "false" && params.get("switcher") !== "0";

    if (isEmbedMode) {
      document.body.classList.add("embed-mode");
      log("Embed mode enabled");
    }

    // Setup floating panel controls (used in both modes for 3D viewer)
    setupFloatingPanel(showSwitcher);
    setupFloatingFiltersPanel();

    // Set up CKGraph callbacks for state synchronization
    CKGraph.onDataLoaded = () => {
      log("CKGraph.onDataLoaded: rebuilding graph");
      // Sync local state from CKGraph
      loadedFromDataUrl = CKGraph.loadedFromDataUrl;
      myKittyIds = CKGraph.myKittyIds;

      // Clear texture cache since resolution may change with new graph size
      textureCache.clear();

      // Rebuild graph data
      graphData = buildGraphData();

      if (graph) {
        // Update existing graph
        graph.graphData(graphData);
      } else {
        // Initialize new graph
        initGraph();
      }
      setStats();

      // Refresh selected panel if a kitty is selected (e.g., after expand)
      if (selectedNodeId && kittyById.has(selectedNodeId)) {
        showSelected(selectedNodeId);
      }
    };

    CKGraph.onRefresh = () => {
      // Sync highlight state from CKGraph
      highlightedTraitGemNodes = CKGraph.highlightedTraitGemNodes;
      if (graph) graph.refresh();
    };

    wireControls();

    // Don't initialize empty graph - wait for data
    // Try to load from URL params
    if (!parseQueryParams()) {
      setStatus("Ready. Load kitties by ID or JSON URL.", false);
    }

    log("CryptoKitties 3D Graph initialized");
  });
})();
