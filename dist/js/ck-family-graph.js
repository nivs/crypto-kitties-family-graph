/* global vis */
(() => {
  const $ = (id) => document.getElementById(id);

  // CryptoKitties official color mappings (extracted from CK CSS)
  // Format: colorName -> [backgroundColor, accentColor, shadowColor]
  const CK_COLORS = {
    // Primary colors
    mintgreen:       ["#cdf5d4", "#43edac", "#9ad7a5"],
    sizzurp:         ["#dfdffa", "#7c40ff", "#c1c1ea"],
    chestnut:        ["#efe1da", "#a56429", "#d4beb3"],
    strawberry:      ["#ffe0e5", "#ef4b62", "#efbaba"],
    sapphire:        ["#d3e8ff", "#4c7aef", "#a2c2eb"],
    forgetmenot:     ["#dcebfc", "#4eb4f9", "#a7caea"],
    dahlia:          ["#e6eafd", "#b8bdff", "#bec5e7"],
    coralsunrise:    ["#fde9e4", "#ff9088", "#e7c3bb"],
    olive:           ["#ecf4e0", "#729100", "#c8d6b4"],
    pinefresh:       ["#dbf0d0", "#177a25", "#adcf9b"],
    oasis:           ["#e6faf3", "#ccffef", "#bee1d4"],
    dioscuri:        ["#e5e7ef", "#484c5b", "#cdd1e0"],
    palejade:        ["#e7f1ed", "#c3d8cf", "#c0d1ca"],
    parakeet:        ["#e5f3e2", "#49b749", "#bcd4b8"],
    cyan:            ["#c5eefa", "#45f0f4", "#83cbe0"],
    topaz:           ["#d1eeeb", "#0ba09c", "#a8d5d1"],
    limegreen:       ["#d9f5cb", "#aef72f", "#b4d9a2"],
    isotope:         ["#effdca", "#e4ff73", "#cde793"],
    babypuke:        ["#eff1e0", "#bcba5e", "#cfd4b0"],
    bubblegum:       ["#fadff4", "#ef52d1", "#eebce3"],
    twilightsparkle: ["#ede2f5", "#ba8aff", "#dcc7ec"],
    doridnudibranch: ["#faeefa", "#fa9fff", "#e1cce1"],
    pumpkin:         ["#fae1ca", "#ffa039", "#efc8a4"],
    autumnmoon:      ["#fdf3e0", "#ffe8bb", "#e7d4b4"],
    bridesmaid:      ["#ffd5e5", "#ffc2df", "#eba3bc"],
    thundergrey:     ["#eee9e8", "#828282", "#dbccc7"],
    greymatter:      ["#e5e7ef", "#828282", "#cdd1e0"],
    // Additional colors from CK CSS
    downbythebay:    ["#cde5d1", "#4e8b57", "#97bc9c"],
    eclipse:         ["#e5e7ef", "#484c5b", "#cdd1e0"],
    // Neutrals
    gold:            ["#faf4cf", "#fcdf35", "#e3daa1"],
    shadowgrey:      ["#b1aeb9", "#575553", "#8a8792"],
    salmon:          ["#fde9e4", "#ef4b62", "#efbaba"],
    cottoncandy:     ["#ffd5e5", "#ffc2df", "#eba3bc"],
    cloudwhite:      ["#f9f8f6", "#e7e6e4", "#d5d4d2"],
    mauveover:       ["#ede2f5", "#ba8aff", "#dcc7ec"],
    hintomint:       ["#cdf5d4", "#43edac", "#9ad7a5"],
    bananacream:     ["#fdf3e0", "#ffe8bb", "#e7d4b4"],
    // Fallback
    default:         ["#23283b", "#000000", "#1a1d2a"]
  };

  function getKittyColors(kitty) {
    const colorName = (kitty.color || "").toLowerCase();
    const hasKnownColor = colorName && CK_COLORS[colorName];
    const colors = CK_COLORS[colorName] || CK_COLORS.default;
    const background = kitty.background_color || kitty.kitty_color || colors[0];
    // Shadow color: use kitty's shadow_color if available, or from CK_COLORS, or darken background
    const shadow = kitty.shadow_color || colors[2] || darkenColor(background, 0.35);
    return {
      background,
      shadow,
      isUnknown: !kitty.background_color && !kitty.kitty_color && !hasKnownColor
    };
  }

  function darkenColor(hex, amount) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return "rgba(0,0,0,0.3)";
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255;
    let g = (n >> 8) & 255;
    let b = n & 255;
    r = Math.max(0, Math.round(r * (1 - amount)));
    g = Math.max(0, Math.round(g * (1 - amount)));
    b = Math.max(0, Math.round(b * (1 - amount)));
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  // Mewtation gem types based on discovery position
  // Diamond: position 1 (first ever)
  // Gold: position 2-10 (gilded)
  // Silver: position 11-100 (amethyst)
  // Bronze: position 101-500 (lapis)
  function getMewtationGems(kitty) {
    const gems = [];
    const raw = kitty.raw || kitty;
    const enhanced = raw.enhanced_cattributes || [];
    const id = Number(kitty.id);

    for (const attr of enhanced) {
      // Only count if this kitty discovered the trait (kittyId matches)
      if (attr.kittyId === id && typeof attr.position === "number" && attr.position > 0 && attr.position <= 500) {
        let gemType;
        if (attr.position === 1) gemType = "diamond";
        else if (attr.position <= 10) gemType = "gold";
        else if (attr.position <= 100) gemType = "silver";
        else gemType = "bronze";

        gems.push({
          type: attr.type,
          description: attr.description,
          position: attr.position,
          gem: gemType
        });
      }
    }

    return gems;
  }

  // Gem image URLs
  const GEM_IMAGES = {
    diamond: "./images/cattributes/mewtation-gems/diamond.svg",
    gold: "./images/cattributes/mewtation-gems/gold.svg",
    silver: "./images/cattributes/mewtation-gems/silver.svg",
    bronze: "./images/cattributes/mewtation-gems/bronze.svg"
  };

  // Cache loaded gem images
  const gemImageCache = new Map();

  async function loadGemImage(gemType) {
    if (gemImageCache.has(gemType)) return gemImageCache.get(gemType);

    const url = GEM_IMAGES[gemType];
    if (!url) return null;

    try {
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      gemImageCache.set(gemType, img);
      return img;
    } catch (e) {
      log("Failed to load gem image:", gemType, e);
      return null;
    }
  }

  // Preload gem images
  function preloadGemImages() {
    for (const gemType of Object.keys(GEM_IMAGES)) {
      loadGemImage(gemType);
    }
  }

  const statusText = $("statusText");
  const bannerEl = $("banner");
  const statsPill = $("statsPill");
  const selectedBox = $("selectedBox");

  function getDefaultsRaw() {
    return (window.CK_GRAPH_DEFAULTS && typeof window.CK_GRAPH_DEFAULTS === "object") ? window.CK_GRAPH_DEFAULTS : {};
  }

  function debugLevel() {
    const d = getDefaultsRaw();
    const n = Number(d.debugLevel);
    return Number.isFinite(n) ? n : 1;
  }

  function log(...args) { if (debugLevel() >= 1) console.log("[CKGRAPH]", ...args); }
  function logv(...args) { if (debugLevel() >= 2) console.log("[CKGRAPH:VV]", ...args); }

  function setStatus(msg, isError = false) {
    if (statusText) statusText.textContent = msg;
    if (bannerEl) {
      bannerEl.textContent = msg;
      bannerEl.style.display = "block";
      bannerEl.style.borderColor = isError ? "rgba(255,107,107,0.55)" : "rgba(122,162,255,0.45)";
      bannerEl.style.color = isError ? "rgba(255,200,200,0.95)" : "rgba(151,163,182,0.95)";
      clearTimeout(setStatus._t);
      setStatus._t = setTimeout(() => { bannerEl.style.display = "none"; }, 2400);
    }
  }

  function assertVisLoaded() {
    if (!window.vis || !vis.DataSet || !vis.Network) {
      setStatus("vis-network not loaded. CDN blocked or CSP.", true);
      throw new Error("vis-network missing");
    }
  }

  function defaults() {
    const d = getDefaultsRaw();
    return {
      proxyUrl: d.proxyUrl || "",
      useProxy: (typeof d.useProxy === "boolean") ? d.useProxy : false,
      svgBaseUrl: d.svgBaseUrl || "",
      svgFromApi: (typeof d.svgFromApi === "boolean") ? d.svgFromApi : true,
      siteBaseUrl: d.siteBaseUrl || "https://www.cryptokitties.co",
      dataUrl: d.dataUrl || "",
      standaloneUrl: d.standaloneUrl || "",
      githubUrl: d.githubUrl || "https://github.com/nivs/crypto-kitties-family-graph"
    };
  }

  function applyDefaultsToUI() {
    const d = defaults();
    log("Protocol:", location.protocol, "URL:", location.href);
    log("CK_GRAPH_DEFAULTS raw:", getDefaultsRaw());
    log("Defaults computed:", d);

    const setVal = (id, v) => { const el = $(id); if (el) el.value = v; };
    const setChecked = (id, v) => { const el = $(id); if (el) el.checked = !!v; };

    setChecked("useProxy", d.useProxy);
    setVal("apiProxyUrl", d.proxyUrl);
    setVal("svgBaseUrl", d.svgBaseUrl);
    setChecked("svgFromApi", d.svgFromApi);
    setVal("siteBaseUrl", d.siteBaseUrl);

    if (d.dataUrl) setVal("jsonUrl", d.dataUrl);
  }

  function isLocalPath(url) {
    if (!url) return false;
    if (url.startsWith("./") || url.startsWith("../") || url.startsWith("/")) return true;
    if (!/^https?:\/\//i.test(url)) return true;
    return false;
  }

  function isCkDomain(url) {
    try {
      const u = new URL(url);
      const host = (u.hostname || "").toLowerCase();
      return host === "api.cryptokitties.co" || host === "cryptokitties.co" || host === "www.cryptokitties.co";
    } catch {
      return false;
    }
  }

  function proxyPrefix() {
    const el = $("apiProxyUrl");
    return (el && el.value ? el.value : "").trim();
  }

  function isProxyEnabled() {
    const el = $("useProxy");
    return el && el.checked;
  }

  function proxify(url) {
    if (!isProxyEnabled()) return url;
    const p = proxyPrefix();
    if (!p) return url;
    if (isLocalPath(url)) return url;
    if (!isCkDomain(url)) return url;
    return p + encodeURIComponent(url);
  }

  function safeText(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") {
      try { return JSON.stringify(v); } catch { return String(v); }
    }
    return String(v);
  }

  function shortAddr(a) {
    if (!a || typeof a !== "string") return "";
    if (a.length <= 12) return a;
    return a.slice(0, 6) + "…" + a.slice(-4);
  }

  function formatDateOnly(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  }

  function formatDatePretty(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  // Known CryptoKitties contract addresses
  const CK_CONTRACTS = {
    "0xb1690c08e213a35ed9bab7b318de14420fb57d8c": "Sale Auction",
    "0xc7af99fe5513eb6710e6d5f44f9989da40f27f26": "Siring Auction",
    "0x06012c8cf97bead5deae237070f9587f8e7a266d": "Core Contract"
  };

  function isAuctionContract(addr) {
    if (!addr) return false;
    return !!CK_CONTRACTS[addr.toLowerCase()];
  }

  function getContractName(addr) {
    if (!addr) return null;
    return CK_CONTRACTS[addr.toLowerCase()] || null;
  }

  function formatEth(weiString) {
    if (!weiString) return null;
    try {
      const wei = BigInt(weiString);
      const eth = Number(wei) / 1e18;
      if (eth < 0.001) return eth.toExponential(2) + " ETH";
      if (eth < 1) return eth.toFixed(4).replace(/\.?0+$/, "") + " ETH";
      if (eth < 100) return eth.toFixed(3).replace(/\.?0+$/, "") + " ETH";
      return eth.toFixed(2).replace(/\.?0+$/, "") + " ETH";
    } catch {
      return null;
    }
  }

  function normalizeOwner(ownerField) {
    if (!ownerField) return null;
    if (typeof ownerField === "string") return ownerField;
    if (typeof ownerField === "object") {
      if (typeof ownerField.address === "string") return ownerField.address;
      if (typeof ownerField.wallet_address === "string") return ownerField.wallet_address;
      if (typeof ownerField.id === "string" && ownerField.id.startsWith("0x")) return ownerField.id;
    }
    return null;
  }

  function normalizeOwnerNickname(k) {
    if (!k || typeof k !== "object") return null;
    const owner = k.owner;
    if (owner && typeof owner === "object") {
      if (typeof owner.nickname === "string" && owner.nickname.trim()) return owner.nickname.trim();
      if (typeof owner.username === "string" && owner.username.trim()) return owner.username.trim();
      if (typeof owner.name === "string" && owner.name.trim()) return owner.name.trim();
    }
    const op = k.owner_profile || k.ownerProfile;
    if (op && typeof op === "object") {
      if (typeof op.nickname === "string" && op.nickname.trim()) return op.nickname.trim();
      if (typeof op.username === "string" && op.username.trim()) return op.username.trim();
      if (typeof op.name === "string" && op.name.trim()) return op.name.trim();
    }
    return null;
  }

  function siteBase() {
    const el = $("siteBaseUrl");
    const v = (el && el.value ? el.value : "https://www.cryptokitties.co").trim();
    return v.replace(/\/$/, "");
  }

  function kittyUrl(id) { return `${siteBase()}/kitty/${id}`; }
  function cattributeUrl(traitValue) {
    return `${siteBase()}/catalogue/cattribute/${encodeURIComponent(traitValue)}`;
  }
  function ownerUrl(addr) { return addr ? `${siteBase()}/profile/${addr}` : ""; }
  function apiUrl(path) { return `https://api.cryptokitties.co/v3${path}`; }

  function wantApiImages() {
    const el = $("svgFromApi");
    return el ? el.checked : true;
  }

  function brightenHex(hex, amt = 0.22) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255;
    let g = (n >> 8) & 255;
    let b = n & 255;
    r = Math.min(255, Math.round(r + (255 - r) * amt));
    g = Math.min(255, Math.round(g + (255 - g) * amt));
    b = Math.min(255, Math.round(b + (255 - b) * amt));
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  function placeholderDataUri(label, bg) {
    const text = encodeURIComponent(String(label || "").slice(0, 16));
    const fill = encodeURIComponent(bg || "#2a2f43");
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
      `<rect x="0" y="0" width="128" height="128" rx="28" ry="28" fill="${decodeURIComponent(fill)}" opacity="0.9"/>` +
      `<text x="50%" y="54%" font-family="ui-sans-serif,system-ui" font-size="20" fill="rgba(255,255,255,0.90)" text-anchor="middle">${decodeURIComponent(text)}</text>` +
      `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function checkeredPlaceholderDataUri(label) {
    const text = encodeURIComponent(String(label || "").slice(0, 16));
    // Checkered pattern with dark and slightly lighter squares
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
      `<defs>` +
      `<pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">` +
      `<rect width="8" height="8" fill="#3a3f53"/>` +
      `<rect x="8" y="0" width="8" height="8" fill="#2a2f43"/>` +
      `<rect x="0" y="8" width="8" height="8" fill="#2a2f43"/>` +
      `<rect x="8" y="8" width="8" height="8" fill="#3a3f53"/>` +
      `</pattern>` +
      `</defs>` +
      `<rect x="0" y="0" width="128" height="128" rx="28" ry="28" fill="url(#checker)"/>` +
      `<text x="50%" y="54%" font-family="ui-sans-serif,system-ui" font-size="18" fill="rgba(255,255,255,0.85)" text-anchor="middle">${decodeURIComponent(text)}</text>` +
      `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function nodeLabel(k) { return k.name ? k.name : `Kitty ${k.id}`; }

  function localImageUrl(id, imageUrl) {
    const el = $("svgBaseUrl");
    const base = (el && el.value ? el.value : "").trim();
    if (!base) return null; // No base URL configured
    const clean = base.endsWith("/") ? base : (base + "/");
    // Determine extension from the API image URL
    const ext = (imageUrl && imageUrl.toLowerCase().includes(".png")) ? "png" : "svg";
    return `${clean}${id}.${ext}`;
  }

  async function probeUrlExistsLocal(url) {
    try {
      const r = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (r.ok) return true;
      if (r.status === 405) throw new Error("HEAD not allowed");
      return false;
    } catch {
      try {
        const r2 = await fetch(url, { method: "GET", cache: "no-store" });
        return r2.ok;
      } catch {
        return false;
      }
    }
  }

  function svgToDataUri(svgText) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  }

  // Data + graph state
  let myKittyIds = new Set();
  let kittyById = new Map();
  let expandedIds = new Set();

  let physicsOn = true;
  let network = null;

  // Owner highlight lock state
  let ownerHighlightLocked = false;
  let lockedOwnerAddr = null;
  let lockedOwnerNick = null;

  const resolvedImgUrl = new Map();
  const nodeBaseStyle = new Map();

  const nodes = new vis.DataSet([]);
  const edges = new vis.DataSet([]);

  async function resolveImageUrlForKitty(k) {
    const id = Number(k.id);
    if (resolvedImgUrl.has(id)) return resolvedImgUrl.get(id);

    const svgBaseEl = $("svgBaseUrl");
    const svgBaseUrl = (svgBaseEl && svgBaseEl.value ? svgBaseEl.value : "").trim();
    const shouldProbe = !!svgBaseUrl; // Probe if svgBaseUrl is set
    const colors = getKittyColors(k);
    const bg = colors.background;
    const shadowColor = colors.shadow;
    const isUnknownColor = colors.isUnknown;

    log("resolveImageUrlForKitty:", { id, svgBaseUrl, shouldProbe, bg, shadowColor, isUnknownColor, hasImageUrl: !!k.image_url });

    const getPlaceholder = () => isUnknownColor ? checkeredPlaceholderDataUri(nodeLabel(k)) : placeholderDataUri(nodeLabel(k), bg);

    const ensureImageUpdated = (imgUrl) => {
      const node = nodes.get(id);
      if (!node) return;
      nodes.update({ id, shape: "circularImage", image: imgUrl || getPlaceholder() });
    };

    if (shouldProbe) {
      const imgUrl = localImageUrl(id, k.image_url);
      if (imgUrl) {
        log("Probing local image:", imgUrl);
        const exists = await probeUrlExistsLocal(imgUrl);
        log("Probe result:", { id, imgUrl, exists });
        if (exists) {
          try {
            const res = await fetch(imgUrl, { cache: "no-store" });
            log("Fetch response:", { id, ok: res.ok, status: res.status });
            if (res.ok) {
              // For SVG, convert to data URI; for PNG, use URL directly
              if (imgUrl.toLowerCase().endsWith(".svg")) {
                const svgText = await res.text();
                log("SVG loaded, length:", svgText.length);
                const uri = svgToDataUri(svgText);
                resolvedImgUrl.set(id, uri);
                ensureImageUpdated(uri);
                return uri;
              } else {
                // PNG or other format - use URL directly
                log("PNG loaded:", imgUrl);
                resolvedImgUrl.set(id, imgUrl);
                ensureImageUpdated(imgUrl);
                return imgUrl;
              }
            }
          } catch (e) {
            log("local image fetch failed:", imgUrl, e);
          }
        }
      }
    }

    if (wantApiImages() && k.image_url) {
      log("Using API fallback image for:", id);
      resolvedImgUrl.set(id, k.image_url);
      ensureImageUpdated(k.image_url);
      return k.image_url;
    }

    const ph = getPlaceholder();
    resolvedImgUrl.set(id, ph);
    ensureImageUpdated(ph);
    return ph;
  }

  function addOrUpdateKittyNode(k, isNew = false) {
    const id = Number(k.id);
    const colors = getKittyColors(k);
    const bg = colors.background;
    const shadowColor = colors.shadow;
    const isUnknownColor = colors.isUnknown;
    const isMine = myKittyIds.has(id);
    const gems = getMewtationGems(k);

    const base = {
      bg,
      shadowColor,
      isUnknownColor,
      size: 32,
      border: isMine ? "#7aa2ff" : (isUnknownColor ? "rgba(255,200,100,0.5)" : "rgba(255,255,255,0.22)"),
      borderWidth: isMine ? 2 : (isUnknownColor ? 2 : 1),
      gems: gems // Store gems for drawing
    };
    nodeBaseStyle.set(id, base);

    // Determine initial image:
    // - If svgBaseUrl is set, we'll probe for local images, so use placeholder to avoid loading API image
    // - Otherwise, use API image_url if available, else placeholder
    const svgBaseEl = $("svgBaseUrl");
    const svgBaseUrl = (svgBaseEl && svgBaseEl.value ? svgBaseEl.value : "").trim();
    const willProbeLocal = !!svgBaseUrl;

    let initialImg;
    if (willProbeLocal) {
      // Use placeholder - resolveImageUrlForKitty will update with local or API image
      initialImg = isUnknownColor ? checkeredPlaceholderDataUri(nodeLabel(k)) : placeholderDataUri(nodeLabel(k), bg);
    } else {
      // No local probing, use API image directly if available
      initialImg = k.image_url || (isUnknownColor ? checkeredPlaceholderDataUri(nodeLabel(k)) : placeholderDataUri(nodeLabel(k), bg));
    }

    // Compute level from generation
    const level = typeof k.generation === "number" ? k.generation : 0;

    // New nodes start small for grow-in animation
    const initialSize = isNew ? 4 : base.size;

    // Use circularImage for rounded kitty display
    const node = {
      id,
      label: nodeLabel(k),
      shape: "circularImage",
      image: initialImg,
      size: initialSize,
      level: level,
      borderWidth: base.borderWidth,
      font: { color: "#e8ecf1", size: 12, face: "ui-sans-serif" },
      color: {
        background: bg,
        border: base.border,
        highlight: { background: brightenHex(bg, 0.25), border: "#ffffff" }
      }
    };

    if (nodes.get(id)) nodes.update(node);
    else nodes.add(node);

    // Animate new nodes to full size
    if (isNew) {
      animateNodeGrowIn(id, base.size);
    }

    resolveImageUrlForKitty(k).catch((e) => log("resolve image error:", id, e));
  }

  function animateNodeGrowIn(id, targetSize) {
    const steps = 12;
    const duration = 500; // ms
    const stepTime = duration / steps;
    let currentStep = 0;
    const startSize = 4;

    const animate = () => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease-out curve for smoother animation
      const eased = 1 - Math.pow(1 - progress, 3);
      const size = startSize + (targetSize - startSize) * eased;

      if (nodes.get(id)) {
        nodes.update({ id, size });
      }

      if (currentStep < steps) {
        setTimeout(animate, stepTime);
      }
    };

    setTimeout(animate, stepTime);
  }

  function addParentEdges(k) {
    const id = Number(k.id);

    // Only create edges to parents that already exist as nodes
    if (k.matron_id) {
      const m = Number(k.matron_id);
      if (nodes.get(m)) {
        edges.update({
          id: `m:${m}->${id}`,
          from: m,
          to: id,
          arrows: { to: { enabled: true, scaleFactor: 1.0, type: "arrow" } },
          width: 2,
          color: EDGE_COLORS.matron
        });
        logv("Edge created: matron", m, "->", id);
      } else {
        logv("Edge skipped: matron", m, "not in nodes for child", id);
      }
    }
    if (k.sire_id) {
      const s = Number(k.sire_id);
      if (nodes.get(s)) {
        edges.update({
          id: `s:${s}->${id}`,
          from: s,
          to: id,
          arrows: { to: { enabled: true, scaleFactor: 1.0, type: "arrow" } },
          width: 2,
          color: EDGE_COLORS.sire
        });
        logv("Edge created: sire", s, "->", id);
      } else {
        logv("Edge skipped: sire", s, "not in nodes for child", id);
      }
    }
  }

  function upsertKitty(k, isNew = false) {
    const kk = { ...k };
    kk.id = Number(kk.id);
    kk.matron_id = kk.matron_id ? Number(kk.matron_id) : null;
    kk.sire_id = kk.sire_id ? Number(kk.sire_id) : null;

    // Owner fields - preserve existing owner_address/owner_nickname if set, otherwise extract
    if (!kk.owner_address) {
      kk.owner_address = normalizeOwner(kk.owner) || normalizeOwner(kk.owner_profile && kk.owner_profile.address) || normalizeOwner(kk.ownerProfile && kk.ownerProfile.address) || null;
    }
    if (!kk.owner_nickname) {
      kk.owner_nickname = normalizeOwnerNickname(kk);
    }

    kittyById.set(kk.id, kk);
    addOrUpdateKittyNode(kk, isNew);
    // Note: edges are created by rebuildAllEdges after all nodes are added
  }

  // Rebuild all parent edges - call after adding nodes
  function rebuildAllEdges() {
    for (const k of kittyById.values()) {
      addParentEdges(k);
    }
  }

  function setStats() {
    if (statsPill) statsPill.textContent = `${nodes.length} nodes, ${edges.length} edges`;
  }

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

  function reachableFromRoots() {
    const roots = Array.from(myKittyIds);
    if (!roots.length) return new Set(nodes.getIds().map(Number));
    const adj = buildAdjacency();
    const seen = new Set();
    const q = [];
    for (const r of roots) { seen.add(r); q.push(r); }
    while (q.length) {
      const x = q.shift();
      const nbrs = adj.get(x);
      if (!nbrs) continue;
      for (const y of nbrs) {
        if (!seen.has(y)) { seen.add(y); q.push(y); }
      }
    }
    return seen;
  }

  function computeMainNodeSet() {
    const ids = nodes.getIds().map(Number);
    if (!ids.length) return [];

    if (myKittyIds.size) {
      return Array.from(reachableFromRoots());
    }

    const adj = buildAdjacency();
    const seen = new Set();
    let best = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      const comp = [];
      const q = [id];
      seen.add(id);
      while (q.length) {
        const x = q.shift();
        comp.push(x);
        const nbrs = adj.get(x);
        if (!nbrs) continue;
        for (const y of nbrs) {
          if (!seen.has(y)) { seen.add(y); q.push(y); }
        }
      }
      if (comp.length > best.length) best = comp;
    }
    return best;
  }

  function rebuildHierarchicalLevels() {
    const levelById = new Map();

    // First pass: set levels from generation data
    for (const k of kittyById.values()) {
      if (typeof k.generation === "number") levelById.set(k.id, k.generation);
      else if (Number.isFinite(Number(k.generation))) levelById.set(k.id, Number(k.generation));
    }

    // Second pass: infer levels for nodes without generation data using parent/child relationships
    // Parents should be at level = child.level - 1
    // Children should be at level = parent.level + 1
    let changed = true;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const k of kittyById.values()) {
        const id = k.id;

        // If this node has a level, propagate to parents
        if (levelById.has(id)) {
          const myLevel = levelById.get(id);

          // Parents should be one level up (lower number = older generation)
          if (k.matron_id && !levelById.has(k.matron_id)) {
            levelById.set(k.matron_id, myLevel - 1);
            changed = true;
          }
          if (k.sire_id && !levelById.has(k.sire_id)) {
            levelById.set(k.sire_id, myLevel - 1);
            changed = true;
          }
        }

        // If this node doesn't have a level but parents do, infer from parents
        if (!levelById.has(id)) {
          let parentLevel = null;
          if (k.matron_id && levelById.has(k.matron_id)) {
            parentLevel = levelById.get(k.matron_id);
          }
          if (k.sire_id && levelById.has(k.sire_id)) {
            const sireLevel = levelById.get(k.sire_id);
            if (parentLevel === null || sireLevel > parentLevel) {
              parentLevel = sireLevel;
            }
          }
          if (parentLevel !== null) {
            levelById.set(id, parentLevel + 1);
            changed = true;
          }
        }
      }
    }

    // Final pass: ensure ALL nodes have a level (default to 0 for orphans)
    let min = Infinity;
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      if (!levelById.has(nid)) {
        levelById.set(nid, 0);
      }
      min = Math.min(min, levelById.get(nid));
    }
    if (!Number.isFinite(min)) min = 0;

    // Normalize levels to start from 0
    const updates = [];
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      updates.push({ id: nid, level: levelById.get(nid) - min });
    }
    nodes.update(updates);

    log("rebuildHierarchicalLevels: assigned levels to", updates.length, "nodes in", iterations, "iterations");
  }

  function fitMainCluster() {
    if (!network) return;

    const main = computeMainNodeSet();
    const existing = new Set(nodes.getIds().map(Number));
    const mainExisting = main.filter((id) => existing.has(Number(id)));

    log("fitMainCluster:", { totalNodes: nodes.length, mainSize: mainExisting.length, roots: myKittyIds.size, physicsOn });
    if (!mainExisting.length) return;

    try {
      network.fit({
        nodes: mainExisting,
        animation: { duration: 600, easingFunction: "easeInOutQuad" }
      });

      // After fit completes, zoom in slightly and shift view up for visual balance
      setTimeout(() => {
        try {
          const s = network.getScale();
          const pos = network.getViewPosition();
          network.moveTo({
            scale: s * 1.15,
            position: { x: pos.x, y: pos.y - 40 },
            animation: { duration: 250 }
          });
        } catch {}
      }, 620);
    } catch (e) {
      log("fitMainCluster fit error:", e);
      return;
    }
  }

  function focusOnRoots() {
    if (!network) return;
    const ids = Array.from(myKittyIds);
    if (!ids.length) { return; }

    try {
      // Calculate center of all root kitties and move there without changing zoom
      const positions = ids.map(id => network.getPosition(id)).filter(p => p);
      if (!positions.length) return;

      const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

      // Offset Y upward to account for visual balance
      const offsetY = centerY - 80;

      network.moveTo({
        position: { x: centerX, y: offsetY },
        animation: { duration: 400, easingFunction: "easeInOutQuad" }
      });
      network.selectNodes(ids);
    } catch (e) {
      log("focusOnRoots error:", e);
    }
  }

  function setPhysics(enabled) {
    if (!network) return;
    physicsOn = enabled;

    if (physicsOn) {
      // Enable physics - nodes will move to find equilibrium
      network.setOptions({
        physics: {
          enabled: true,
          stabilization: { enabled: true, iterations: 200, updateInterval: 25, fit: true },
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: -80,
            centralGravity: 0.01,
            springLength: 100,
            springConstant: 0.08,
            damping: 0.4,
            avoidOverlap: 0.8
          }
        }
      });
      network.stabilize();
    } else {
      // Disable physics - nodes stay where they are
      network.setOptions({ physics: { enabled: false } });
    }

    const btn = $("togglePhysicsBtn");
    if (btn) btn.textContent = `Physics: ${physicsOn ? "on" : "off"}`;
  }

  async function fetchJson(url) {
    const finalUrl = proxify(url);
    logv("fetchJson:", { url, finalUrl });
    const res = await fetch(finalUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  }

  function unwrapKitty(obj) {
    if (obj && typeof obj === "object" && obj.kitty && typeof obj.kitty === "object") return obj.kitty;
    return obj;
  }

  function unwrapKittiesList(obj) {
    if (obj && typeof obj === "object") {
      for (const k of ["kitties", "items", "results"]) if (Array.isArray(obj[k])) return obj[k];
      if (obj.data && typeof obj.data === "object") {
        for (const k of ["kitties", "items", "results"]) if (Array.isArray(obj.data[k])) return obj.data[k];
      }
    }
    return [];
  }

  function normalizeFromApi(raw) {
    const id = Number(raw.id);
    const generation = (typeof raw.generation === "number") ? raw.generation : (Number.isFinite(Number(raw.generation)) ? Number(raw.generation) : null);

    const matron_id = raw.matron_id ?? raw.matronId ?? (raw.matron && raw.matron.id ? Number(raw.matron.id) : null);
    const sire_id = raw.sire_id ?? raw.sireId ?? (raw.sire && raw.sire.id ? Number(raw.sire.id) : null);

    const background_color = raw.background_color || raw.backgroundColor || null;
    const color = raw.color || null; // CK color name like "mintgreen", "bubblegum"
    const image_url = raw.image_url || raw.imageUrl || raw.image_url_cdn || raw.imageUrlCdn || null;

    // Extract auction info
    const auction = raw.auction && typeof raw.auction === "object" && raw.auction.type ? raw.auction : null;
    const isOnAuction = auction && auction.status === "open";
    const auctionType = auction ? auction.type : null; // "sale" or "sire"
    const seller = auction && auction.seller ? auction.seller : null;

    // Extract traits from enhanced_cattributes
    const traits = {};
    const enhanced = raw.enhanced_cattributes || [];
    for (const attr of enhanced) {
      if (attr.type && attr.description) {
        traits[attr.type] = attr.description;
      }
    }

    return {
      id,
      name: raw.name || null,
      generation,
      created_at: raw.created_at || raw.createdAt || null,
      birthday: raw.birthday || null,
      genes: raw.genes || null,
      color, // CK color name
      background_color,
      kitty_color: background_color || null,
      shadow_color: raw.shadow_color || raw.shadowColor || null,
      image_url,
      owner: raw.owner || raw.owner_profile || raw.owner_address || raw.ownerAddress || null,
      owner_profile: raw.owner_profile || null,
      owner_wallet_address: raw.owner_wallet_address || null,
      hatcher: raw.hatcher || null,
      auction: auction,
      isOnAuction: isOnAuction,
      auctionType: auctionType,
      seller: seller,
      matron_id: matron_id ? Number(matron_id) : null,
      sire_id: sire_id ? Number(sire_id) : null,
      enhanced_cattributes: enhanced,
      traits,
      raw
    };
  }

  function mergeJson(data, animateNew = false) {
    if (!data) return;
    const list = Array.isArray(data.kitties) ? data.kitties : [];
    log("mergeJson:", { incoming: list.length, nodesBefore: nodes.length, edgesBefore: edges.length, animateNew });

    for (const k of list) {
      const kk = (k && typeof k.id !== "undefined") ? k : normalizeFromApi(k);
      if (!kk || !kk.id) continue;

      const isNew = animateNew && !kittyById.has(Number(kk.id));
      const existing = kittyById.get(Number(kk.id));
      const merged = existing ? { ...existing } : { ...kk };

      for (const [key, val] of Object.entries(kk)) {
        if (val !== null && val !== undefined && val !== "") merged[key] = val;
      }

      if (merged.traits && kk.traits) merged.traits = { ...merged.traits, ...kk.traits };

      upsertKitty(merged, isNew);
    }
  }

  async function expandFamily(id) {
    if (!id) return;
    if (expandedIds.has(id)) { setStatus(`Already expanded ${id}`, false); return; }
    expandedIds.add(id);

    log("expandFamily:", id);

    try {
      const kitty = await fetchJson(apiUrl(`/kitties/${id}`));
      const kObj = unwrapKitty(kitty);

      // Collect all kitties to add: the main kitty, plus embedded parents and children
      const kittiesToAdd = [normalizeFromApi(kObj)];

      // Extract embedded matron (mother) if present
      if (kObj.matron && typeof kObj.matron === "object" && kObj.matron.id) {
        log("expandFamily: extracting embedded matron", kObj.matron.id);
        kittiesToAdd.push(normalizeFromApi(kObj.matron));
      }

      // Extract embedded sire (father) if present
      if (kObj.sire && typeof kObj.sire === "object" && kObj.sire.id) {
        log("expandFamily: extracting embedded sire", kObj.sire.id);
        kittiesToAdd.push(normalizeFromApi(kObj.sire));
      }

      // Extract embedded children if present
      // Note: embedded children don't have matron_id/sire_id fields, so we set them manually
      if (Array.isArray(kObj.children) && kObj.children.length > 0) {
        log("expandFamily: extracting", kObj.children.length, "embedded children");
        for (const child of kObj.children) {
          if (child && typeof child === "object" && child.id) {
            const normalized = normalizeFromApi(child);
            // Set parent reference since embedded children lack this info
            // We don't know if expanded kitty is matron or sire, so check which is null
            if (!normalized.matron_id) normalized.matron_id = id;
            else if (!normalized.sire_id) normalized.sire_id = id;
            kittiesToAdd.push(normalized);
          }
        }
      }

      log("expandFamily api merge:", { id, totalKitties: kittiesToAdd.length });
      mergeJson({ root_ids: [id], kitties: kittiesToAdd }, true); // animate new nodes

      rebuildAllEdges(); // Create edges now that all nodes exist
      setStats();
      log("expandFamily post-merge:", { nodes: nodes.length, edges: edges.length });

      // Run physics stabilization to rearrange nodes
      network.setOptions({
        physics: {
          enabled: true,
          stabilization: { enabled: true, iterations: 200, updateInterval: 25, fit: true }
        }
      });
      network.stabilize();
      physicsOn = true;

      setTimeout(() => fitMainCluster(), 200);
      setStatus(`Expanded ${id}`, false);
    } catch (e) {
      console.error(e);
      expandedIds.delete(id);
      setStatus(`Expand failed for ${id}: ${e && e.message ? e.message : String(e)}`, true);
    }
  }

  // Edge color definitions
  const EDGE_COLORS = {
    matron: { color: "#ff5aa5", highlight: "#ff7dbb" },
    sire: { color: "#4aa8ff", highlight: "#7bc1ff" },
    // Brighter versions for parent edges (edges TO the hovered node)
    matronParent: { color: "#ff1a85", highlight: "#ff4da6" },
    sireParent: { color: "#1a8fff", highlight: "#4dabff" },
    // Softer versions for child edges (edges FROM the hovered node)
    matronChild: { color: "#ff8fc4", highlight: "#ffb8da" },
    sireChild: { color: "#8fc9ff", highlight: "#b8dcff" },
    // Dimmed versions - very dark but still tinted pink/blue
    matronDimmed: { color: "#3d1a2a", highlight: "#3d1a2a" },
    sireDimmed: { color: "#1a2a3d", highlight: "#1a2a3d" }
  };

  function getEdgeColor(edgeId) {
    if (edgeId.startsWith("m:")) return EDGE_COLORS.matron;
    if (edgeId.startsWith("s:")) return EDGE_COLORS.sire;
    return EDGE_COLORS.matron; // fallback
  }

  function highlightFamilyEdges(hoveredId) {
    const k = kittyById.get(hoveredId);
    const parentEdgeIds = new Set();
    const childEdgeIds = new Set();

    // Find edges to/from this kitty's direct parents and children
    if (k) {
      // Parent edges (edges FROM parents TO this kitty) - brighter
      if (k.matron_id) parentEdgeIds.add(`m:${k.matron_id}->${hoveredId}`);
      if (k.sire_id) parentEdgeIds.add(`s:${k.sire_id}->${hoveredId}`);
    }

    // Child edges (edges FROM this kitty TO children) - softer
    for (const [childId, childK] of kittyById.entries()) {
      if (childK.matron_id === hoveredId) childEdgeIds.add(`m:${hoveredId}->${childId}`);
      if (childK.sire_id === hoveredId) childEdgeIds.add(`s:${hoveredId}->${childId}`);
    }

    log("highlightFamilyEdges:", { hoveredId, parentEdges: Array.from(parentEdgeIds), childEdges: Array.from(childEdgeIds), totalEdges: edges.length });

    // Update all edges: dim non-family, brighten family with parent/child distinction
    const updates = [];
    for (const edge of edges.get()) {
      if (parentEdgeIds.has(edge.id)) {
        // Parent edges - brighter colors, thicker
        const color = edge.id.startsWith("m:") ? EDGE_COLORS.matronParent : EDGE_COLORS.sireParent;
        updates.push({ id: edge.id, color: color, width: 3, arrows: { to: { enabled: true, scaleFactor: 0.6 } } });
      } else if (childEdgeIds.has(edge.id)) {
        // Child edges - softer colors, larger arrowhead
        const color = edge.id.startsWith("m:") ? EDGE_COLORS.matronChild : EDGE_COLORS.sireChild;
        updates.push({ id: edge.id, color: color, width: 2, arrows: { to: { enabled: true, scaleFactor: 1.0, type: "arrow" } } });
      } else {
        // Dim non-family edges - use tinted dark colors based on edge type
        const dimColor = edge.id.startsWith("m:") ? EDGE_COLORS.matronDimmed : EDGE_COLORS.sireDimmed;
        updates.push({ id: edge.id, color: dimColor, width: 1.5, arrows: { to: { enabled: true, scaleFactor: 0.5 } } });
      }
    }
    if (updates.length) edges.update(updates);
  }

  function restoreEdgeColors() {
    const updates = [];
    for (const edge of edges.get()) {
      updates.push({
        id: edge.id,
        color: getEdgeColor(edge.id),
        width: 2,
        arrows: { to: { enabled: true, scaleFactor: 1.0, type: "arrow" } }
      });
    }
    if (updates.length) edges.update(updates);
  }

  function highlightOwnerKitties(ownerAddr, ownerNick) {
    if (!ownerAddr && !ownerNick) return;
    const ownedIds = new Set();
    const ownerAddrLower = ownerAddr ? ownerAddr.toLowerCase() : null;
    const ownerNickLower = ownerNick ? ownerNick.toLowerCase() : null;

    // Find all kitties owned by this address OR nickname
    for (const [id, k] of kittyById.entries()) {
      let matched = false;

      // Check address if provided
      if (ownerAddrLower) {
        const addrCandidates = [
          k.owner_address,
          k.owner_wallet_address,
          normalizeOwner(k.owner),
          k.raw?.owner_wallet_address,
          normalizeOwner(k.raw?.owner),
          k.raw?.owner?.address,
          k.owner?.address,
          k.ownerProfile?.address,
          k.raw?.ownerProfile?.address
        ];

        for (const addr of addrCandidates) {
          if (addr && typeof addr === "string" && addr.toLowerCase() === ownerAddrLower) {
            matched = true;
            break;
          }
        }
      }

      // Check nickname if provided (and not already matched)
      if (!matched && ownerNickLower) {
        const nickCandidates = [
          k.owner_nickname,
          normalizeOwnerNickname(k),
          k.owner?.nickname,
          k.owner?.username,
          k.owner?.name,
          k.raw?.owner?.nickname,
          k.raw?.owner?.username,
          k.raw?.owner?.name,
          k.owner_profile?.nickname,
          k.raw?.owner_profile?.nickname
        ];

        for (const nick of nickCandidates) {
          if (nick && typeof nick === "string" && nick.toLowerCase() === ownerNickLower) {
            matched = true;
            break;
          }
        }
      }

      // Also check seller field for auctioned kitties
      if (!matched) {
        const auction = k.auction || k.raw?.auction;
        const seller = k.seller || auction?.seller;
        if (seller) {
          const sellerAddr = normalizeOwner(seller);
          const sellerNick = seller?.nickname || seller?.username || seller?.name;

          if (ownerAddrLower && sellerAddr && sellerAddr.toLowerCase() === ownerAddrLower) {
            matched = true;
          } else if (ownerNickLower && sellerNick && sellerNick.toLowerCase() === ownerNickLower) {
            matched = true;
          }
        }
      }

      if (matched) ownedIds.add(id);
    }

    log("highlightOwnerKitties:", { ownerAddr, ownerNick, count: ownedIds.size, ids: Array.from(ownedIds) });

    // Highlight owned nodes, dim others
    const nodeUpdates = [];
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      const base = nodeBaseStyle.get(nid);
      if (!base) continue;

      if (ownedIds.has(nid)) {
        nodeUpdates.push({
          id: nid,
          size: 38,
          color: { background: brightenHex(base.bg, 0.25), border: "#7aa2ff" },
          borderWidth: 3
        });
      } else {
        nodeUpdates.push({
          id: nid,
          color: { background: base.bg, border: "rgba(255,255,255,0.1)" },
          borderWidth: 1
        });
      }
    }
    if (nodeUpdates.length) nodes.update(nodeUpdates);

    // Keep edges between owned kitties colored, dim others
    const edgeUpdates = [];
    for (const edge of edges.get()) {
      // Parse edge id to get from/to nodes (format: "m:123->456" or "s:123->456")
      const match = edge.id.match(/^([ms]):(\d+)->(\d+)$/);
      if (match) {
        const fromId = Number(match[2]);
        const toId = Number(match[3]);
        const dimColor = edge.id.startsWith("m:") ? EDGE_COLORS.matronDimmed : EDGE_COLORS.sireDimmed;

        // If both ends are owned by this owner, keep the edge colored
        if (ownedIds.has(fromId) && ownedIds.has(toId)) {
          edgeUpdates.push({
            id: edge.id,
            color: getEdgeColor(edge.id),
            width: 2,
            arrows: { to: { enabled: true, scaleFactor: 1.0, type: "arrow" } }
          });
        } else {
          edgeUpdates.push({
            id: edge.id,
            color: dimColor,
            width: 1.5,
            arrows: { to: { enabled: true, scaleFactor: 0.5 } }
          });
        }
      } else {
        const dimColor = edge.id.startsWith("m:") ? EDGE_COLORS.matronDimmed : EDGE_COLORS.sireDimmed;
        edgeUpdates.push({
          id: edge.id,
          color: dimColor,
          width: 1.5,
          arrows: { to: { enabled: true, scaleFactor: 0.5 } }
        });
      }
    }
    if (edgeUpdates.length) edges.update(edgeUpdates);
  }

  function restoreAllNodes() {
    const nodeUpdates = [];
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      const base = nodeBaseStyle.get(nid);
      if (!base) continue;
      nodeUpdates.push({
        id: nid,
        size: base.size,
        color: { background: base.bg, border: base.border },
        borderWidth: base.borderWidth
      });
    }
    if (nodeUpdates.length) nodes.update(nodeUpdates);
    restoreEdgeColors();
  }

  const tooltipEl = $("tooltip");

  // Format gem name for display
  function gemDisplayName(gemType) {
    const names = { diamond: "Diamond", gold: "Gilded", silver: "Amethyst", bronze: "Lapis" };
    return names[gemType] || gemType;
  }

  // Generate HTML for mewtation gems
  function gemsHtml(gems, compact = false) {
    if (!gems || gems.length === 0) return "";

    const gemPriority = { diamond: 4, gold: 3, silver: 2, bronze: 1 };
    const sortedGems = [...gems].sort((a, b) => (gemPriority[b.gem] || 0) - (gemPriority[a.gem] || 0));

    if (compact) {
      // Compact version for tooltip - just show icons and count
      return sortedGems.map(g =>
        `<span class="gem-badge gem-${g.gem}" title="${safeText(g.description)} #${g.position}">
          <img src="${GEM_IMAGES[g.gem]}" alt="${g.gem}" style="width:14px;height:14px;vertical-align:middle;" />
        </span>`
      ).join("");
    }

    // Full version for right pane
    return sortedGems.map(g =>
      `<div class="gem-item">
        <img src="${GEM_IMAGES[g.gem]}" alt="${g.gem}" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;" />
        <span class="gem-label">${gemDisplayName(g.gem)}</span>
        <span class="gem-detail">${safeText(g.type)}: ${safeText(g.description)} (#${g.position})</span>
      </div>`
    ).join("");
  }

  function showTooltip(id, event) {
    if (!tooltipEl) return;
    const k = kittyById.get(id);
    if (!k) return;

    const img = k.image_url || "";
    const title = safeText(k.name || `Kitty ${k.id}`);
    const sub = `#${k.id}` + (typeof k.generation === "number" ? ` · Gen ${k.generation}` : "");

    const born = formatDateOnly(k.created_at || k.birthday || "");
    const traits = k.traits || {};
    const traitKeys = Object.keys(traits).slice(0, 4);
    const gems = getMewtationGems(k);
    const gemsCompact = gemsHtml(gems, true);
    const colors = getKittyColors(k);

    // Build traits with mewtation highlighting
    const traitsHtml = traitKeys.map(t => {
      const gem = gems.find(g => g.type === t);
      if (gem) {
        return `<span class="tag tag-mewtation" title="${gemDisplayName(gem.gem)} #${gem.position}">
          <img src="${GEM_IMAGES[gem.gem]}" alt="" style="width:10px;height:10px;vertical-align:middle;margin-right:2px;" />
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

    // Position tooltip near cursor
    const rect = $("networkWrap").getBoundingClientRect();
    const e = event && event.pointer && event.pointer.DOM ? event.pointer.DOM : { x: 100, y: 100 };
    let x = e.x + 15;
    let y = e.y + 15;

    // Keep tooltip within bounds
    tooltipEl.style.display = "block";
    const ttRect = tooltipEl.getBoundingClientRect();
    if (x + ttRect.width > rect.width - 10) x = e.x - ttRect.width - 15;
    if (y + ttRect.height > rect.height - 10) y = e.y - ttRect.height - 15;

    tooltipEl.style.left = `${Math.max(10, x)}px`;
    tooltipEl.style.top = `${Math.max(10, y)}px`;
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = "none";
  }

  function showSelected(id) {
    const k = kittyById.get(id);
    if (!k) {
      if (selectedBox) selectedBox.textContent = `Unknown kitty ${id}`;
      return;
    }

    // Check auction status from raw data or normalized fields
    const raw = k.raw || k;
    const auction = k.auction || (raw.auction && raw.auction.type ? raw.auction : null);
    const isOnAuction = auction && auction.status === "open";
    const auctionType = auction ? auction.type : null;
    const seller = k.seller || (auction ? auction.seller : null);

    // Get the raw owner address
    const rawOwnerAddr = normalizeOwner(k.owner) || k.owner_address || k.owner_wallet_address || null;
    const ownerIsContract = isAuctionContract(rawOwnerAddr);

    // Determine display owner: seller if on auction or owner is contract, otherwise owner
    let displayOwnerAddr, displayOwnerNick, showAuctionStatus;
    if ((isOnAuction || ownerIsContract) && seller) {
      // Have seller info from auction data
      displayOwnerAddr = normalizeOwner(seller) || null;
      displayOwnerNick = seller.nickname || seller.username || seller.name || null;
      showAuctionStatus = true;
    } else if (ownerIsContract) {
      // Owner is auction contract but no seller info - show as "On Auction"
      displayOwnerAddr = null;
      displayOwnerNick = null;
      showAuctionStatus = true;
    } else {
      displayOwnerAddr = rawOwnerAddr;
      displayOwnerNick = k.owner_nickname || normalizeOwnerNickname(k) || null;
      showAuctionStatus = isOnAuction;
    }

    const ownerText = displayOwnerNick ? displayOwnerNick : (displayOwnerAddr ? shortAddr(displayOwnerAddr) : null);

    let ownerHtml;
    if (displayOwnerAddr || displayOwnerNick) {
      const dataOwner = displayOwnerAddr ? `data-owner="${safeText(displayOwnerAddr)}"` : "";
      const dataNick = displayOwnerNick ? `data-owner-nick="${safeText(displayOwnerNick)}"` : "";
      const linkHref = displayOwnerAddr ? ownerUrl(displayOwnerAddr) : "#";
      const isLocked = ownerHighlightLocked &&
        ((lockedOwnerAddr && displayOwnerAddr && lockedOwnerAddr.toLowerCase() === displayOwnerAddr.toLowerCase()) ||
         (lockedOwnerNick && displayOwnerNick && lockedOwnerNick.toLowerCase() === displayOwnerNick.toLowerCase()));
      const pinTitle = isLocked ? "Unpin owner highlight" : "Pin owner highlight";
      const pinOpacity = isLocked ? "1" : "0.4";
      ownerHtml = `<a href="${linkHref}" target="_blank" rel="noopener" class="owner-link" ${dataOwner} ${dataNick} style="color:var(--accent);text-decoration:none;">${safeText(ownerText)}</a>
        <button class="owner-pin-btn" ${dataOwner} ${dataNick} title="${pinTitle}" style="background:none;border:none;cursor:pointer;padding:0 4px;font-size:12px;opacity:${pinOpacity};vertical-align:baseline;line-height:1;">📍</button>`;
    } else if (showAuctionStatus) {
      ownerHtml = `<span class="small" style="color:rgba(255,200,100,0.8);">On Auction</span>`;
    } else {
      ownerHtml = "";
    }

    // Auction status badge with price (links to kitty page where auction is displayed)
    let statusHtml = "";
    if (isOnAuction) {
      const statusLabel = auctionType === "sire" ? "For Siring" : "For Sale";
      const currentPrice = formatEth(auction.current_price);
      const priceHtml = currentPrice ? ` · ${currentPrice}` : "";
      statusHtml = `<div class="k">Status</div><div class="v"><a href="${kittyUrl(id)}" target="_blank" rel="noopener" class="tag" style="background:rgba(255,90,165,0.25);color:#ff5aa5;text-decoration:none;">${statusLabel}${priceHtml}</a></div>`;
    }

    // Background color display
    const colors = getKittyColors(k);
    const colorName = k.color || null;
    const bgColorHtml = colors.isUnknown
      ? `<span class="small" style="color:rgba(255,200,100,0.8);">Unknown</span>`
      : `<span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${colors.background};vertical-align:middle;margin-right:6px;border:1px solid rgba(255,255,255,0.2);"></span>${colorName ? safeText(colorName) : colors.background}`;

    const traits = k.traits || {};
    const traitKeys = Object.keys(traits).slice(0, 12);
    const gems = getMewtationGems(k);
    const gemsFull = gemsHtml(gems, false);

    // Create a set of trait types that earned mewtations for highlighting
    const mewtationTraits = new Set(gems.map(g => g.type));

    if (!selectedBox) return;

    // Build traits HTML with highlighting for mewtation-earning traits and links to cattribute pages
    const traitsHtml = traitKeys.map(t => {
      const traitValue = traits[t];
      const traitLink = `<a href="${cattributeUrl(traitValue)}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none;">${safeText(traitValue)}</a>`;
      const gem = gems.find(g => g.type === t);
      if (gem) {
        return `<span class="tag tag-mewtation" title="${gemDisplayName(gem.gem)} #${gem.position}">
          <img src="${GEM_IMAGES[gem.gem]}" alt="" style="width:12px;height:12px;vertical-align:middle;margin-right:2px;" />
          ${t}: ${traitLink}
        </span>`;
      }
      return `<span class="tag">${t}: ${traitLink}</span>`;
    }).join("");

    const kittyImg = k.image_url || "";

    selectedBox.innerHTML = `
      <div class="selected-header" style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
        <div class="selected-thumb" style="background:${colors.background};--shadow-color:${colors.shadow};">
          ${kittyImg ? `<img src="${kittyImg}" alt="" />` : ""}
        </div>
        <div>
          <div style="font-weight:600;font-size:14px;"><a href="${kittyUrl(id)}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none;">${safeText(k.name || `Kitty ${k.id}`)}</a></div>
          <div style="color:var(--muted);font-size:12px;">#${k.id} · Gen ${safeText(k.generation)}</div>
        </div>
      </div>
      <div class="kv">
        <div class="k">Color</div><div class="v">${bgColorHtml}</div>
        <div class="k">Born</div><div class="v">${formatDatePretty(k.created_at || k.birthday || "")}</div>
        <div class="k">Owner</div><div class="v">${ownerHtml}</div>
        ${statusHtml}
        ${gems.length ? `<div class="k">Mewtations</div><div class="v gems-list">${gemsFull}</div>` : ""}
        <div class="k">Traits</div>
        <div class="v">${traitKeys.length ? traitsHtml : "<span class='small'>None</span>"}</div>
      </div>
    `;

    // Helper to set up owner highlight handlers on a container
    function setupOwnerHighlightHandlers(container) {
      const ownerLink = container.querySelector(".owner-link");
      const pinBtn = container.querySelector(".owner-pin-btn");

      if (ownerLink) {
        ownerLink.addEventListener("mouseenter", () => {
          if (ownerHighlightLocked) return; // Don't change highlight if locked
          const addr = ownerLink.dataset.owner || null;
          const nick = ownerLink.dataset.ownerNick || null;
          highlightOwnerKitties(addr, nick);
        });
        ownerLink.addEventListener("mouseleave", () => {
          if (ownerHighlightLocked) return; // Keep highlight if locked
          restoreAllNodes();
        });
      }

      if (pinBtn) {
        pinBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const addr = pinBtn.dataset.owner || null;
          const nick = pinBtn.dataset.ownerNick || null;

          // Check if clicking the same owner that's already locked
          const isSameOwner = ownerHighlightLocked &&
            ((lockedOwnerAddr && addr && lockedOwnerAddr.toLowerCase() === addr.toLowerCase()) ||
             (lockedOwnerNick && nick && lockedOwnerNick.toLowerCase() === nick.toLowerCase()));

          if (isSameOwner) {
            // Unlock
            ownerHighlightLocked = false;
            lockedOwnerAddr = null;
            lockedOwnerNick = null;
            restoreAllNodes();
            log("Owner highlight unlocked");
          } else {
            // Lock to this owner
            ownerHighlightLocked = true;
            lockedOwnerAddr = addr;
            lockedOwnerNick = nick;
            highlightOwnerKitties(addr, nick);
            log("Owner highlight locked:", { addr, nick });
          }

          // Re-render to update pin button state
          showSelected(id);
        });
      }
    }

    // Set up handlers for sidebar
    setupOwnerHighlightHandlers(selectedBox);

    // Also update floating panel (for embed mode)
    const floatingBox = $("floatingSelectedBox");
    if (floatingBox) {
      floatingBox.innerHTML = selectedBox.innerHTML;
      // Set up handlers for floating panel
      setupOwnerHighlightHandlers(floatingBox);
      // Show floating panel if hidden
      const floatingPanel = $("floatingPanel");
      if (floatingPanel) floatingPanel.classList.remove("panel-hidden");
    }

    logv("showSelected:", { id, owner_addr: displayOwnerAddr, owner_nick: displayOwnerNick, isOnAuction, auctionType, gems });
  }

  function renderNetwork() {
    const container = $("network");
    if (!container) throw new Error("Missing #network element");

    // Use physics-based layout instead of hierarchical to avoid level issues
    const options = {
      layout: {
        improvedLayout: true,
        hierarchical: { enabled: false }
      },
      physics: {
        enabled: true,
        stabilization: { enabled: true, iterations: 300, updateInterval: 25, fit: true },
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -80,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08,
          damping: 0.4,
          avoidOverlap: 0.8
        }
      },
      nodes: {
        chosen: false // Disable vis-network's automatic hover/select styling - we handle it manually
      },
      edges: {
        smooth: { enabled: true, type: "continuous", roundness: 0.5 },
        arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        chosen: false // Disable vis-network's automatic hover styling
      },
      interaction: { hover: true, hoverConnectedEdges: false, dragNodes: true, dragView: true, zoomView: true }
    };

    if (network) {
      try { network.destroy(); } catch {}
      network = null;
    }

    network = new vis.Network(container, { nodes, edges }, options);
    physicsOn = true;

    // Shadow drawing is tricky with circularImage nodes because:
    // - beforeDrawing: draws under node background (hidden)
    // - afterDrawing: draws on top of everything (covers cat)
    //
    // The CK website uses CSS ::before on a container, which isn't possible here.
    // For now, shadows are disabled. To get proper shadows, we'd need to either:
    // 1. Use 'image' shape instead of 'circularImage' and inject shadow into SVG
    // 2. Create a custom node renderer
    //
    // Keeping this code for reference but disabled:
    /*
    network.on("beforeDrawing", (ctx) => {
      const shadowToggle = $("showShadows");
      if (!shadowToggle || shadowToggle.value !== "on") return;
      // ... shadow drawing code ...
    });
    */

    // Draw mewtation gems at the edge of nodes
    network.on("afterDrawing", (ctx) => {
      const positions = network.getPositions();

      for (const [id, pos] of Object.entries(positions)) {
        const base = nodeBaseStyle.get(Number(id));
        if (!base || !base.gems || base.gems.length === 0) continue;

        // Get actual node size from the node data (accounts for hover enlargement)
        const node = nodes.get(Number(id));
        const nodeSize = node && node.size ? node.size : (base.size || 32);
        const gemSize = nodeSize > 36 ? 20 : 16; // Larger gems when node is enlarged

        // Sort gems by priority (diamond > gold > silver > bronze)
        const gemPriority = { diamond: 4, gold: 3, silver: 2, bronze: 1 };
        const sortedGems = [...base.gems].sort((a, b) => (gemPriority[b.gem] || 0) - (gemPriority[a.gem] || 0));

        // Show up to 3 gems, positioned around the bottom-right edge of the circle
        const gemsToShow = sortedGems.slice(0, 3);

        for (let i = 0; i < gemsToShow.length; i++) {
          const gem = gemsToShow[i];
          const img = gemImageCache.get(gem.gem);
          if (!img) continue;

          // Position gems at the edge of the circle (bottom-right quadrant)
          // Use angle to place them along the circle's edge
          const angle = Math.PI * 0.25 + (i * Math.PI * 0.2); // Start at ~45 degrees, spread 36 degrees apart
          const edgeX = pos.x + Math.cos(angle) * nodeSize;
          const edgeY = pos.y + Math.sin(angle) * nodeSize;

          ctx.save();
          ctx.drawImage(img, edgeX - gemSize / 2, edgeY - gemSize / 2, gemSize, gemSize);
          ctx.restore();
        }
      }
    });

    network.on("click", (params) => {
      const id = params.nodes && params.nodes[0];
      if (id) showSelected(Number(id));
      else if (selectedBox) selectedBox.textContent = "None";
    });

    network.on("doubleClick", async (params) => {
      const id = params.nodes && params.nodes[0];
      if (!id) return;
      await expandFamily(Number(id));
    });

    network.on("hoverNode", (params) => {
      const id = Number(params.node);
      const base = nodeBaseStyle.get(id);
      if (!base) return;

      // Enlarge hovered node
      nodes.update({ id, size: 42, color: { background: brightenHex(base.bg, 0.28), border: "#ffffff" } });

      // Show tooltip
      showTooltip(id, params.event);

      // Dim edges that aren't direct parent/child connections
      highlightFamilyEdges(id);
    });

    network.on("blurNode", (params) => {
      const id = Number(params.node);
      const base = nodeBaseStyle.get(id);
      if (!base) return;

      // Hide tooltip
      hideTooltip();

      // Restore state - respect owner highlight if pinned
      if (ownerHighlightLocked) {
        // Restore node to base size first, then reapply owner highlighting
        nodes.update({ id, size: base.size });
        highlightOwnerKitties(lockedOwnerAddr, lockedOwnerNick);
      } else {
        // Restore node to base state
        nodes.update({ id, size: base.size, color: { background: base.bg, border: base.border } });
        restoreEdgeColors();
      }
    });

    setStats();

    setTimeout(() => {
      focusOnRoots();
      setStatus("Rendered graph", false);
    }, 60);
  }

  function loadJsonObject(obj) {
    nodes.clear();
    edges.clear();
    kittyById = new Map();
    expandedIds = new Set();
    resolvedImgUrl.clear();
    nodeBaseStyle.clear();

    const roots = Array.isArray(obj.root_ids) ? obj.root_ids.map(Number) : [];
    myKittyIds = new Set(roots);

    const kitties = Array.isArray(obj.kitties) ? obj.kitties : [];
    log("loadJsonObject:", { roots: roots.length, kitties: kitties.length });

    for (const k of kitties) upsertKitty(k);
    rebuildAllEdges(); // Create edges after all nodes exist

    renderNetwork();
    setStatus(`Loaded ${kitties.length} kitties`, false);
  }

  async function loadJsonFromUrl(url) {
    log("loadJsonFromUrl:", url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const data = await res.json();
    loadJsonObject(data);
  }

  async function loadKittiesById(ids) {
    if (!ids || ids.length === 0) return;
    log("loadKittiesById:", ids);
    setStatus(`Loading ${ids.length} kitty(s)...`, false);

    const kittiesToAdd = [];
    const requestedIds = new Set(ids.map(Number));
    const fetchedIds = new Set(); // Track which IDs we've actually fetched from API
    const embeddedData = new Map(); // Store embedded data keyed by ID

    try {
      // First pass: fetch ALL directly requested kitties (no skipping)
      for (const id of ids) {
        const numId = Number(id);
        if (fetchedIds.has(numId)) continue; // Skip only if already fetched
        fetchedIds.add(numId);

        log("loadKittiesById: fetching requested", numId);
        const kitty = await fetchJson(apiUrl(`/kitties/${numId}`));
        const kObj = unwrapKitty(kitty);
        const normalized = normalizeFromApi(kObj);
        kittiesToAdd.push(normalized);

        // Collect embedded parents (only if NOT in requested IDs)
        if (kObj.matron && typeof kObj.matron === "object" && kObj.matron.id) {
          const matronId = Number(kObj.matron.id);
          if (!requestedIds.has(matronId) && !embeddedData.has(matronId)) {
            embeddedData.set(matronId, normalizeFromApi(kObj.matron));
          }
        }
        if (kObj.sire && typeof kObj.sire === "object" && kObj.sire.id) {
          const sireId = Number(kObj.sire.id);
          if (!requestedIds.has(sireId) && !embeddedData.has(sireId)) {
            embeddedData.set(sireId, normalizeFromApi(kObj.sire));
          }
        }

        // Collect embedded children (only if NOT in requested IDs)
        if (Array.isArray(kObj.children) && kObj.children.length > 0) {
          for (const child of kObj.children) {
            if (child && typeof child === "object" && child.id) {
              const childId = Number(child.id);
              if (!requestedIds.has(childId) && !embeddedData.has(childId)) {
                const childNorm = normalizeFromApi(child);
                // Set parent reference since embedded children may lack this
                if (!childNorm.matron_id) childNorm.matron_id = numId;
                else if (!childNorm.sire_id) childNorm.sire_id = numId;
                embeddedData.set(childId, childNorm);
              }
            }
          }
        }
      }

      // Second pass: add embedded parents/children that weren't requested
      for (const [embId, embKitty] of embeddedData) {
        if (!fetchedIds.has(embId)) {
          kittiesToAdd.push(embKitty);
        }
      }

      log("loadKittiesById: fetched", fetchedIds.size, "requested, plus", embeddedData.size, "embedded =", kittiesToAdd.length, "total");

      // Check if any of the new kitties connect to existing graph
      const existingIds = new Set(nodes.getIds().map(Number));
      let hasConnection = false;

      if (existingIds.size > 0) {
        for (const k of kittiesToAdd) {
          if (existingIds.has(k.id)) {
            hasConnection = true;
            break;
          }
          if (k.matron_id && existingIds.has(k.matron_id)) {
            hasConnection = true;
            break;
          }
          if (k.sire_id && existingIds.has(k.sire_id)) {
            hasConnection = true;
            break;
          }
        }

        if (!hasConnection) {
          const newIds = new Set(kittiesToAdd.map(k => k.id));
          for (const existingK of kittyById.values()) {
            if (existingK.matron_id && newIds.has(existingK.matron_id)) {
              hasConnection = true;
              break;
            }
            if (existingK.sire_id && newIds.has(existingK.sire_id)) {
              hasConnection = true;
              break;
            }
          }
        }
      }

      if (hasConnection) {
        log("loadKittiesById: merging into existing graph (connection found)");
        mergeJson({ kitties: kittiesToAdd }, true);
        rebuildAllEdges();
        setStats();

        network.setOptions({
          physics: {
            enabled: true,
            stabilization: { enabled: true, iterations: 200, updateInterval: 25, fit: true }
          }
        });
        network.stabilize();
        physicsOn = true;

        setTimeout(() => fitMainCluster(), 200);
        setStatus(`Added ${ids.length} kitty(s) to graph`, false);
      } else {
        log("loadKittiesById: loading as new graph (no connection)");
        loadJsonObject({ root_ids: Array.from(requestedIds), kitties: kittiesToAdd });
        setStatus(`Loaded ${ids.length} kitty(s)`, false);
      }
    } catch (e) {
      console.error(e);
      setStatus(`Failed to load kitties: ${e.message}`, true);
    }
  }

  function parseKittyIds(str) {
    if (!str) return [];
    return str.split(/[,\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => n && !isNaN(n));
  }

  function wireControls() {
    const fileBtn = $("loadFileBtn");
    const picker = $("filePicker");
    if (fileBtn && picker) {
      fileBtn.addEventListener("click", () => picker.click());
      picker.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        log("load from file:", file.name, file.size);
        const text = await file.text();
        loadJsonObject(JSON.parse(text));
      });
    }

    const urlBtn = $("loadFromUrlBtn");
    const urlInput = $("jsonUrl");
    if (urlBtn && urlInput) {
      urlBtn.addEventListener("click", async () => {
        const url = urlInput.value.trim();
        if (!url) { setStatus("Enter a JSON URL or use Load JSON File", true); return; }
        try { await loadJsonFromUrl(url); }
        catch (e) { console.error(e); setStatus("Failed to load JSON URL", true); }
      });
    }

    const centerBtn = $("centerMineBtn");
    if (centerBtn) centerBtn.addEventListener("click", () => focusOnRoots());

    const fitBtn = $("fitBtn");
    if (fitBtn) fitBtn.addEventListener("click", () => fitMainCluster());

    const physBtn = $("togglePhysicsBtn");
    if (physBtn) physBtn.addEventListener("click", () => setPhysics(!physicsOn));

    // Navigation controls (zoom, pan)
    const zoomInBtn = $("zoomInBtn");
    if (zoomInBtn) zoomInBtn.addEventListener("click", () => {
      if (!network) return;
      const scale = network.getScale();
      network.moveTo({ scale: scale * 1.3, animation: { duration: 200 } });
    });

    const zoomOutBtn = $("zoomOutBtn");
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => {
      if (!network) return;
      const scale = network.getScale();
      network.moveTo({ scale: scale / 1.3, animation: { duration: 200 } });
    });

    const panAmount = 150;
    const moveUpBtn = $("moveUpBtn");
    if (moveUpBtn) moveUpBtn.addEventListener("click", () => {
      if (!network) return;
      const pos = network.getViewPosition();
      network.moveTo({ position: { x: pos.x, y: pos.y - panAmount }, animation: { duration: 200 } });
    });

    const moveDownBtn = $("moveDownBtn");
    if (moveDownBtn) moveDownBtn.addEventListener("click", () => {
      if (!network) return;
      const pos = network.getViewPosition();
      network.moveTo({ position: { x: pos.x, y: pos.y + panAmount }, animation: { duration: 200 } });
    });

    const moveLeftBtn = $("moveLeftBtn");
    if (moveLeftBtn) moveLeftBtn.addEventListener("click", () => {
      if (!network) return;
      const pos = network.getViewPosition();
      network.moveTo({ position: { x: pos.x - panAmount, y: pos.y }, animation: { duration: 200 } });
    });

    const moveRightBtn = $("moveRightBtn");
    if (moveRightBtn) moveRightBtn.addEventListener("click", () => {
      if (!network) return;
      const pos = network.getViewPosition();
      network.moveTo({ position: { x: pos.x + panAmount, y: pos.y }, animation: { duration: 200 } });
    });

    // Load kitty by ID(s)
    const kittyIdInput = $("kittyIdInput");
    const loadKittyBtn = $("loadKittyBtn");
    if (loadKittyBtn && kittyIdInput) {
      const doLoadKitties = async () => {
        const ids = parseKittyIds(kittyIdInput.value);
        if (!ids.length) { setStatus("Enter valid kitty ID(s)", true); return; }
        await loadKittiesById(ids);
      };
      loadKittyBtn.addEventListener("click", doLoadKitties);
      kittyIdInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") doLoadKitties();
      });
    }

    ["apiProxyUrl", "svgBaseUrl", "svgFromApi", "siteBaseUrl"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("change", () => {
        log("settings changed:", id, el.value);
        resolvedImgUrl.clear();
        for (const k of kittyById.values()) addOrUpdateKittyNode(k);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    assertVisLoaded();
    applyDefaultsToUI();
    wireControls();
    preloadGemImages(); // Load mewtation gem images

    // Settings panel collapse toggle
    const settingsToggle = $("settingsToggle");
    const settingsBody = $("settingsBody");
    if (settingsToggle && settingsBody) {
      settingsToggle.addEventListener("click", () => {
        settingsToggle.classList.toggle("collapsed");
        settingsBody.classList.toggle("collapsed");
      });
    }

    // Check for query params
    const params = new URLSearchParams(location.search);

    // Embed mode
    const isEmbedMode = params.get("embed") === "true" || params.get("embed") === "1";
    if (isEmbedMode) {
      document.body.classList.add("embed-mode");
      log("Embed mode enabled");
    }

    // Floating panel controls (for embed mode)
    const floatingPanel = $("floatingPanel");
    const floatingPanelHeader = $("floatingPanelHeader");
    const floatingPanelCollapse = $("floatingPanelCollapse");
    const floatingPanelClose = $("floatingPanelClose");
    const floatingGithubLink = $("floatingGithubLink");
    const floatingViewerLink = $("floatingViewerLink");

    // Set up GitHub link
    if (floatingGithubLink) {
      floatingGithubLink.href = defaults().githubUrl;
    }

    // Collapse toggle
    if (floatingPanelCollapse && floatingPanel) {
      floatingPanelCollapse.addEventListener("click", (e) => {
        e.stopPropagation();
        floatingPanel.classList.toggle("collapsed");
        // Rotate the chevron icon
        const svg = floatingPanelCollapse.querySelector("svg");
        if (svg) {
          svg.style.transform = floatingPanel.classList.contains("collapsed") ? "rotate(180deg)" : "";
        }
      });
    }

    // Close button
    if (floatingPanelClose && floatingPanel) {
      floatingPanelClose.addEventListener("click", (e) => {
        e.stopPropagation();
        floatingPanel.classList.add("panel-hidden");
      });
    }

    // Drag functionality
    if (floatingPanelHeader && floatingPanel) {
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;

      floatingPanelHeader.addEventListener("mousedown", (e) => {
        if (e.target.closest(".panel-btn")) return; // Don't drag when clicking buttons
        isDragging = true;
        const rect = floatingPanel.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        floatingPanel.style.transition = "none";
      });

      document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const x = e.clientX - dragOffsetX;
        const y = e.clientY - dragOffsetY;
        // Keep within viewport
        const maxX = window.innerWidth - floatingPanel.offsetWidth;
        const maxY = window.innerHeight - floatingPanel.offsetHeight;
        floatingPanel.style.left = Math.max(0, Math.min(x, maxX)) + "px";
        floatingPanel.style.top = Math.max(0, Math.min(y, maxY)) + "px";
        floatingPanel.style.right = "auto";
      });

      document.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          floatingPanel.style.transition = "";
        }
      });

      // Keep panel within viewport on window resize
      window.addEventListener("resize", () => {
        if (floatingPanel.style.right !== "auto") return; // Only adjust if manually positioned
        const rect = floatingPanel.getBoundingClientRect();
        const maxX = window.innerWidth - floatingPanel.offsetWidth;
        const maxY = window.innerHeight - floatingPanel.offsetHeight;
        let needsUpdate = false;
        let newX = rect.left;
        let newY = rect.top;

        if (rect.left > maxX) {
          newX = Math.max(0, maxX);
          needsUpdate = true;
        }
        if (rect.top > maxY) {
          newY = Math.max(0, maxY);
          needsUpdate = true;
        }
        if (rect.right > window.innerWidth) {
          newX = Math.max(0, window.innerWidth - floatingPanel.offsetWidth);
          needsUpdate = true;
        }
        if (rect.bottom > window.innerHeight) {
          newY = Math.max(0, window.innerHeight - floatingPanel.offsetHeight);
          needsUpdate = true;
        }

        if (needsUpdate) {
          floatingPanel.style.left = newX + "px";
          floatingPanel.style.top = newY + "px";
        }
      });
    }

    // Viewer link - opens standalone viewer with root kitty IDs (not expanded family)
    if (floatingViewerLink) {
      floatingViewerLink.addEventListener("click", (e) => {
        e.preventDefault();
        const standaloneUrl = defaults().standaloneUrl;
        if (!standaloneUrl) {
          log("No standaloneUrl configured");
          return;
        }
        // Get root kitty IDs (not expanded family members)
        const rootIds = Array.from(myKittyIds);
        if (rootIds.length === 0) {
          log("No root kitties to open in viewer");
          window.open(standaloneUrl, "_blank");
          return;
        }
        // Open viewer with kitty IDs as query param
        const url = `${standaloneUrl}?kitties=${rootIds.join(",")}`;
        window.open(url, "_blank");
        log("Opened viewer with root kitties:", rootIds);
      });
    }

    // Apply svgBaseUrl from query param if provided
    const svgBaseUrlParam = params.get("svgBaseUrl");
    if (svgBaseUrlParam) {
      const el = $("svgBaseUrl");
      if (el) el.value = svgBaseUrlParam;
      log("svgBaseUrl from query param:", svgBaseUrlParam);
    }

    // Apply dataUrl from query param if provided
    const dataUrlParam = params.get("dataUrl");
    if (dataUrlParam) {
      const el = $("jsonUrl");
      if (el) el.value = dataUrlParam;
      log("dataUrl from query param:", dataUrlParam);
    }

    // Check for ?kitty= or ?kitties= (comma-separated IDs)
    const kittyParam = params.get("kitty") || params.get("kitties");
    const kittyIds = parseKittyIds(kittyParam);

    // Check for ?owner= to pin owner highlight (detects address vs nickname)
    const ownerParam = params.get("owner");

    // Helper to apply owner highlight after graph loads
    const applyOwnerHighlight = () => {
      if (ownerParam) {
        // Wait a bit for the graph to stabilize
        setTimeout(() => {
          // Detect if it's an Ethereum address (0x + 40 hex chars = 42 total)
          const isAddress = /^0x[0-9a-fA-F]{40}$/.test(ownerParam);
          ownerHighlightLocked = true;
          lockedOwnerAddr = isAddress ? ownerParam : null;
          lockedOwnerNick = isAddress ? null : ownerParam;
          highlightOwnerKitties(lockedOwnerAddr, lockedOwnerNick);
          log("Owner highlight from query param:", { owner: ownerParam, isAddress });
        }, 500);
      }
    };

    if (kittyIds.length > 0) {
      // Query param takes precedence - load from API
      log("Loading from query param:", kittyIds);
      loadKittiesById(kittyIds).then(() => {
        applyOwnerHighlight();
      }).catch((e) => {
        console.error(e);
        setStatus("Failed to load kitties from query param", true);
      });
    } else {
      // Fall back to default JSON URL (from query param or config)
      const urlEl = $("jsonUrl");
      const url = (urlEl && urlEl.value ? urlEl.value : "").trim();
      if (url) {
        loadJsonFromUrl(url).then(() => {
          applyOwnerHighlight();
        }).catch((e) => {
          console.error(e);
          setStatus("Failed to load default JSON", true);
        });
      } else {
        setStatus("Ready. Load JSON or enter kitty ID(s).", false);
      }
    }
  });
})();