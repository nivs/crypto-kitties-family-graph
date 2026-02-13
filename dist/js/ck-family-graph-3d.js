/* CryptoKitties Family Graph - 3D Version */
/* global ForceGraph3D, THREE, SpriteText */
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

  // ===================== DATA STATE =====================
  let graph = null;
  let viewportGizmo = null;
  let kittyById = new Map();
  let graphData = { nodes: [], links: [] };
  let myKittyIds = new Set();
  let expandedIds = new Set();

  // Selection and highlight state
  let selectedNodeId = null;
  let shortestPathMode = false;
  let lockedPathToId = null;
  let zAxisMode = "generation";

  // Filters
  let generationHighlightActive = false;
  let generationRangeMin = null;
  let generationRangeMax = null;
  let mewtationHighlightActive = false;
  let highlightedGemTypes = new Set();

  // Texture cache for node sprites
  const textureCache = new Map();
  const textureLoader = new THREE.TextureLoader();

  // ===================== API / DATA LOADING =====================
  // (fetchJson, unwrapKitty, normalizeFromApi imported from shared.js)

  // ===================== MEWTATIONS DISPLAY =====================
  function gemDisplayName(gemType) {
    const names = { diamond: "Diamond", gold: "Gilded", silver: "Amethyst", bronze: "Lapis" };
    return names[gemType] || gemType;
  }

  function cattributeUrl(traitValue) {
    return `${siteBase()}/catalogue/cattribute/${encodeURIComponent(traitValue)}`;
  }

  function gemsHtml(gems, compact = false) {
    if (!gems || gems.length === 0) return "";

    const gemPriority = { diamond: 4, gold: 3, silver: 2, bronze: 1 };
    const sortedGems = [...gems].sort((a, b) => (gemPriority[b.gem] || 0) - (gemPriority[a.gem] || 0));

    if (compact) {
      // Compact version for tooltip - just show icons
      return sortedGems.map(g =>
        `<span class="gem-badge gem-${g.gem}" data-gem="${g.gem}" title="${safeText(g.description)} #${g.position}">
          <img src="${GEM_IMAGES[g.gem]}" alt="${g.gem}" class="gem-icon gem-icon-md" />
        </span>`
      ).join("");
    }

    // Full version for selected panel
    return sortedGems.map(g =>
      `<div class="gem-item" data-gem="${g.gem}">
        <img src="${GEM_IMAGES[g.gem]}" alt="${g.gem}" class="gem-icon gem-icon-lg" />
        <span class="gem-label">${gemDisplayName(g.gem)}</span>
        <span class="gem-detail">${safeText(g.type)}: <a href="${cattributeUrl(g.description)}" target="_blank" rel="noopener" class="trait-link">${safeText(g.description)}</a> (#${g.position})</span>
      </div>`
    ).join("");
  }

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
  function loadKittyTexture(imageUrl, bgColor) {
    if (!imageUrl) return createColorTexture(bgColor);

    const cacheKey = `${imageUrl}|${bgColor}`;
    if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);

    // Create a canvas texture with background color, then draw image on top
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Fill with background color first
    ctx.fillStyle = bgColor || "#23283b";
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    textureCache.set(cacheKey, texture);

    // Load image and draw on top of background
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
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

    // Check for trait/gem hover highlighting (takes priority over filters)
    const traitGemHoverActive = highlightedTraitGemNodes.size > 0;
    const isTraitGemHighlighted = traitGemHoverActive && highlightedTraitGemNodes.has(node.id);
    const isTraitGemDimmed = traitGemHoverActive && !isTraitGemHighlighted;

    // Check if this node matches active filters for highlighting
    const filterActive = generationHighlightActive || mewtationHighlightActive;
    const isHighlighted = filterActive && doesKittyMatchFilters(k);
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

    // Apply highlighting: path mode > trait/gem hover > filters
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
  function doesKittyMatchFilters(k) {
    if (!k) return false;

    if (generationHighlightActive) {
      if (typeof k.generation !== "number") return false;
      const inRange =
        (generationRangeMin === null || k.generation >= generationRangeMin) &&
        (generationRangeMax === null || k.generation <= generationRangeMax);
      if (!inRange) return false;
    }

    if (mewtationHighlightActive) {
      const gems = getMewtationGems(k);
      if (gems.length === 0) return false;
      if (highlightedGemTypes.size > 0) {
        let hasMatch = false;
        for (const gem of gems) {
          if (highlightedGemTypes.has(gem.gem)) { hasMatch = true; break; }
        }
        if (!hasMatch) return false;
      }
    }

    return true;
  }

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
      const sourceMatch = doesKittyMatchFilters(sourceNode.kitty);
      const targetMatch = doesKittyMatchFilters(targetNode.kitty);
      if (sourceMatch && targetMatch) return 0.8;
    }
    return 0.1;
  }

  // ===================== SHORTEST PATH =====================
  function buildAdjacency() {
    const adj = new Map();
    const add = (a, b) => {
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b);
      adj.get(b).add(a);
    };
    for (const k of kittyById.values()) {
      if (k.matron_id) add(k.id, k.matron_id);
      if (k.sire_id) add(k.id, k.sire_id);
    }
    return adj;
  }

  function findShortestPath(fromId, toId) {
    if (fromId === toId) return [fromId];
    const adj = buildAdjacency();
    if (!adj.has(fromId) || !adj.has(toId)) return [];

    const visited = new Set([fromId]);
    const queue = [[fromId]];

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      const neighbors = adj.get(current);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (neighbor === toId) return [...path, neighbor];
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return [];
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
        const path = findShortestPath(selectedNodeId, node.id);
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

  // ===================== SELECTION PANEL =====================
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
      }
    }

    // Update floating panel (embed mode)
    if (floatingBox) {
      if (!k) {
        floatingBox.innerHTML = "Click a kitty to select";
      } else {
        floatingBox.innerHTML = renderKittyDetails(k, id);
        // Set up handlers for floating panel
        setupTraitHighlightHandlers(floatingBox);
        setupGemHighlightHandlers(floatingBox);
      }
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
    const ownerAddr = k.owner_address || normalizeOwner(k.owner) || null;
    const ownerNick = k.owner_nickname || normalizeOwnerNickname(k) || null;
    const ownerText = ownerNick || (ownerAddr ? shortAddr(ownerAddr) : "Unknown");

    const traits = k.traits || {};
    const traitKeys = Object.keys(traits).slice(0, 12);
    const gems = getMewtationGems(k);
    const gemsFull = gemsHtml(gems, false);

    // Build traits HTML with mewtation highlighting
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
        <div class="k">Born</div><div class="v">${formatDatePretty(k.created_at || k.birthday)}</div>
        <div class="k">Owner</div><div class="v">${ownerAddr ? `<a href="${ownerUrl(ownerAddr)}" target="_blank" class="owner-link">${safeText(ownerText)}</a>` : ownerText}</div>
        ${gems.length ? `<div class="k">Mewtations</div><div class="v gems-list">${gemsFull}</div>` : ""}
        <div class="k">Traits</div>
        <div class="v">${traitKeys.length ? traitsHtml : "<span style='color:var(--muted)'>None</span>"}</div>
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

    // 2D view button - pass current query params with embed=true
    if (view2dBtn) {
      view2dBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const url2d = generatePermalinkUrl(window.location.origin + "/index.html", false); // Don't include 3D camera params
        window.location.href = url2d;
      });
    }

    // Make panel draggable
    if (dragHandle) {
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;

      dragHandle.addEventListener("mousedown", (e) => {
        if (e.target === closeBtn || e.target === view2dBtn) return;
        isDragging = true;
        initialX = e.clientX - (parseInt(panel.style.left) || 0);
        initialY = e.clientY - (parseInt(panel.style.top) || 0);
      });

      document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        panel.style.left = currentX + "px";
        panel.style.top = currentY + "px";
        panel.style.right = "auto";
      });

      document.addEventListener("mouseup", () => {
        isDragging = false;
      });
    }
  }

  // ===================== GRAPH INITIALIZATION =====================
  function initGraph() {
    const container = $("graph-container");
    if (!container) return;

    graph = ForceGraph3D()(container)
      .backgroundColor("#0b0d12")
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

        if (shortestPathMode && selectedNodeId && node.id !== selectedNodeId) {
          lockedPathToId = node.id;
          highlightPath(selectedNodeId, node.id);
          return;
        }

        selectedNodeId = node.id;
        lockedPathToId = null;
        showSelected(node.id);
        graph.refresh();

        // Focus camera on selected node
        const distance = 200;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
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
      });

    // Set initial camera position
    graph.cameraPosition({ x: 0, y: 0, z: 500 });

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

    log("Graph initialized");
  }

  // ===================== VIEWPORT GIZMO =====================
  function initViewportGizmo() {
    if (!graph || !window.ViewportGizmo) return;

    try {
      const camera = graph.camera();
      const renderer = graph.renderer();

      viewportGizmo = new window.ViewportGizmo(camera, renderer, {
        placement: "bottom-left",
        size: 100,
        lineWidth: 3,
        background: {
          color: 0x12161e,
          opacity: 0.75,
          hover: {
            color: 0x1a1e2a,
            opacity: 0.85
          }
        }
      });

      // Start gizmo render loop
      function renderGizmo() {
        if (viewportGizmo && graph) {
          viewportGizmo.render();
        }
        requestAnimationFrame(renderGizmo);
      }
      renderGizmo();

      // Update gizmo on window resize
      const originalResize = window.onresize;
      window.onresize = () => {
        if (originalResize) originalResize();
        if (viewportGizmo) viewportGizmo.update();
      };

      log("Viewport gizmo initialized");
    } catch (e) {
      console.error("Failed to initialize viewport gizmo:", e);
    }
  }

  // ===================== PATH HIGHLIGHTING =====================
  let highlightedPath = new Set();
  let highlightedPathLinks = new Set();
  let highlightedTraitGemNodes = new Set(); // For trait/gem hover highlighting

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
    const path = findShortestPath(fromId, toId);
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
  function loadJsonObject(obj) {
    kittyById.clear();
    expandedIds.clear();

    const roots = Array.isArray(obj.root_ids) ? obj.root_ids.map(Number) : [];
    myKittyIds = new Set(roots);

    const kitties = Array.isArray(obj.kitties) ? obj.kitties : [];
    log("loadJsonObject:", { roots: roots.length, kitties: kitties.length });

    for (const k of kitties) {
      const kk = (k && typeof k.id !== "undefined") ? k : normalizeFromApi(k);
      if (!kk || !kk.id) continue;
      kittyById.set(Number(kk.id), kk);
    }

    graphData = buildGraphData();

    // Clear container and reinitialize graph
    const container = $("graph-container");
    if (container && graph) {
      container.innerHTML = "";
      graph = null;
    }
    initGraph();

    setStats();
    setStatus(`Loaded ${kitties.length} kitties`, false);
  }

  async function loadJsonFromUrl(url) {
    log("loadJsonFromUrl:", url);
    loadedFromDataUrl = url;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const data = await res.json();
    loadJsonObject(data);
  }

  async function loadKittiesById(ids, noExpand = false) {
    if (!ids || ids.length === 0) return;
    log("loadKittiesById:", ids);
    setStatus(`Loading ${ids.length} kitty(s)...`, false);

    const kittiesToAdd = [];
    const requestedIds = new Set(ids.map(Number));
    const fetchedIds = new Set();
    const embeddedData = new Map();

    try {
      for (const id of ids) {
        const numId = Number(id);
        if (fetchedIds.has(numId)) continue;
        fetchedIds.add(numId);

        const kitty = await fetchJson(apiUrl(`/kitties/${numId}`));
        const kObj = unwrapKitty(kitty);
        const normalized = normalizeFromApi(kObj);
        kittiesToAdd.push(normalized);

        if (!noExpand) {
          if (kObj.matron && kObj.matron.id) {
            const matronId = Number(kObj.matron.id);
            if (!requestedIds.has(matronId) && !embeddedData.has(matronId)) {
              embeddedData.set(matronId, normalizeFromApi(kObj.matron));
            }
          }
          if (kObj.sire && kObj.sire.id) {
            const sireId = Number(kObj.sire.id);
            if (!requestedIds.has(sireId) && !embeddedData.has(sireId)) {
              embeddedData.set(sireId, normalizeFromApi(kObj.sire));
            }
          }
          if (Array.isArray(kObj.children)) {
            for (const child of kObj.children) {
              if (child && child.id) {
                const childId = Number(child.id);
                if (!requestedIds.has(childId) && !embeddedData.has(childId)) {
                  const childNorm = normalizeFromApi(child);
                  if (!childNorm.matron_id) childNorm.matron_id = numId;
                  else if (!childNorm.sire_id) childNorm.sire_id = numId;
                  embeddedData.set(childId, childNorm);
                }
              }
            }
          }
        }
      }

      for (const [embId, embKitty] of embeddedData) {
        if (!fetchedIds.has(embId)) {
          kittiesToAdd.push(embKitty);
        }
      }

      loadJsonObject({ root_ids: Array.from(requestedIds), kitties: kittiesToAdd });
      setStatus(`Loaded ${ids.length} kitty(s)`, false);
    } catch (e) {
      console.error(e);
      setStatus(`Failed to load kitties: ${e.message}`, true);
    }
  }

  async function addKittiesById(ids, noExpand = false) {
    if (!ids || ids.length === 0) return;
    log("addKittiesById:", ids);
    setStatus(`Adding ${ids.length} kitty(s)...`, false);

    const kittiesToAdd = [];
    const requestedIds = new Set(ids.map(Number));
    const fetchedIds = new Set();
    const embeddedData = new Map();

    try {
      // Fetch requested kitties
      for (const id of ids) {
        const numId = Number(id);

        // Skip if already in graph
        if (kittyById.has(numId)) {
          log("addKittiesById: skipping already loaded", numId);
          continue;
        }

        if (fetchedIds.has(numId)) continue;
        fetchedIds.add(numId);

        const kitty = await fetchJson(apiUrl(`/kitties/${numId}`));
        const kObj = unwrapKitty(kitty);
        const normalized = normalizeFromApi(kObj);
        kittiesToAdd.push(normalized);

        // Collect embedded parents/children (skip if noExpand)
        if (!noExpand) {
          if (kObj.matron && kObj.matron.id) {
            const matronId = Number(kObj.matron.id);
            if (!kittyById.has(matronId) && !requestedIds.has(matronId) && !embeddedData.has(matronId)) {
              embeddedData.set(matronId, normalizeFromApi(kObj.matron));
            }
          }
          if (kObj.sire && kObj.sire.id) {
            const sireId = Number(kObj.sire.id);
            if (!kittyById.has(sireId) && !requestedIds.has(sireId) && !embeddedData.has(sireId)) {
              embeddedData.set(sireId, normalizeFromApi(kObj.sire));
            }
          }
          if (Array.isArray(kObj.children)) {
            for (const child of kObj.children) {
              if (child && child.id) {
                const childId = Number(child.id);
                if (!kittyById.has(childId) && !requestedIds.has(childId) && !embeddedData.has(childId)) {
                  const childNorm = normalizeFromApi(child);
                  if (!childNorm.matron_id) childNorm.matron_id = numId;
                  else if (!childNorm.sire_id) childNorm.sire_id = numId;
                  embeddedData.set(childId, childNorm);
                }
              }
            }
          }
        }
      }

      // Add embedded data
      for (const [embId, embKitty] of embeddedData) {
        if (!kittyById.has(embId) && !fetchedIds.has(embId)) {
          kittiesToAdd.push(embKitty);
        }
      }

      if (kittiesToAdd.length === 0) {
        setStatus("All kitties already in graph", false);
        return;
      }

      log("addKittiesById: adding", kittiesToAdd.length, "kitties to existing graph");

      // Add new kitties to kittyById and rebuild
      myKittyIds = new Set([...myKittyIds, ...requestedIds]);
      for (const k of kittiesToAdd) {
        kittyById.set(Number(k.id), k);
      }

      graphData = buildGraphData();
      if (graph) {
        graph.graphData(graphData);
      }
      setStats();
      setStatus(`Added ${kittiesToAdd.length} kitty(s) to graph`, false);
    } catch (e) {
      console.error(e);
      setStatus(`Failed to add kitties: ${e.message}`, true);
    }
  }

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
  let loadedFromDataUrl = null;

  function generatePermalinkUrl(basePath = "", includeViewport = true) {
    const base = basePath || window.location.origin;
    let url;

    if (loadedFromDataUrl && expandedIds.size === 0) {
      url = `${base}?dataUrl=${encodeURIComponent(loadedFromDataUrl)}`;
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

    // Add camera position parameters - only for same viewer type
    if (includeViewport && graph) {
      const camPos = graph.cameraPosition();
      if (camPos) {
        url += `&cameraX=${camPos.x.toFixed(1)}`;
        url += `&cameraY=${camPos.y.toFixed(1)}`;
        url += `&cameraZ=${camPos.z.toFixed(1)}`;
      }
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
        await loadKittiesById(ids);
      };

      const doAddKitties = async () => {
        const ids = kittyIdInput.value.split(/[,\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => n && !isNaN(n));
        if (!ids.length) { setStatus("Enter valid kitty ID(s)", true); return; }
        await addKittiesById(ids);
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
          try { await loadJsonFromUrl(url); }
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
          loadedFromDataUrl = null;
          const text = await file.text();
          const data = JSON.parse(text);
          loadJsonObject(data);
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
          loadedFromDataUrl = null;
          const text = await file.text();
          const data = JSON.parse(text);
          loadJsonObject(data);
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
        const url2d = generatePermalinkUrl(window.location.origin + "/index.html", false); // Don't include 3D camera params
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
        url.searchParams.delete("cameraX");
        url.searchParams.delete("cameraY");
        url.searchParams.delete("cameraZ");
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

    // ESC key handler
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Disable shortest path mode
        if (shortestPathMode) {
          shortestPathMode = false;
          lockedPathToId = null;
          const spToggle = $("shortestPathMode");
          if (spToggle) spToggle.checked = false;
          clearPathHighlight();
          if (graph) graph.refresh();
        }
        // Remove focus to prevent blue outline on buttons
        if (document.activeElement) document.activeElement.blur();
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

    // Camera position params
    const cameraXParam = params.get("cameraX");
    const cameraYParam = params.get("cameraY");
    const cameraZParam = params.get("cameraZ");
    pendingCameraPos = null;
    if (cameraXParam && cameraYParam && cameraZParam) {
      pendingCameraPos = {
        x: parseFloat(cameraXParam),
        y: parseFloat(cameraYParam),
        z: parseFloat(cameraZParam)
      };
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
        loadKittiesById(ids, noExpand).then(applyPendingSelections);
        dataLoaded = true;
      }
    }

    // Check for dataUrl
    const dataUrl = params.get("dataUrl");
    if (!dataLoaded && dataUrl) {
      loadJsonFromUrl(dataUrl).then(applyPendingSelections).catch(e => {
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
            const distance = 200;
            const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
            graph.cameraPosition(
              { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
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
        graph.cameraPosition(pendingCameraPos, { x: 0, y: 0, z: 0 }, 1000);
        log("Camera position from query params:", pendingCameraPos);
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

      // Setup floating panel controls
      setupFloatingPanel(showSwitcher);
    }

    wireControls();

    // Don't initialize empty graph - wait for data
    // Try to load from URL params
    if (!parseQueryParams()) {
      setStatus("Ready. Load kitties by ID or JSON URL.", false);
    }

    log("CryptoKitties 3D Graph initialized");
  });
})();
