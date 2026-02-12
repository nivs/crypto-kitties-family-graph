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

  function formatDateTimeFull(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      // Show in local time with timezone abbreviation
      return d.toLocaleString("en-US", { timeZoneName: "short" });
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

  // Look up owner nickname from other kitties in the graph that have the same address
  function lookupOwnerNickname(addr) {
    if (!addr) return null;
    const addrLower = addr.toLowerCase();

    for (const k of kittyById.values()) {
      const kAddr = k.owner_address || normalizeOwner(k.owner);
      if (kAddr && kAddr.toLowerCase() === addrLower) {
        const nick = k.owner_nickname || normalizeOwnerNickname(k);
        if (nick) return nick;
      }
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

  function wantPrefetchChildren() {
    const el = $("prefetchChildren");
    return el ? el.checked : true;
  }

  function wantAutoConnect() {
    const el = $("autoConnect");
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
    // Use Array.from to properly handle emoji (surrogate pairs) before truncating
    const text = encodeURIComponent(Array.from(String(label || "")).slice(0, 16).join(""));
    const fill = encodeURIComponent(bg || "#2a2f43");
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
      `<rect x="0" y="0" width="128" height="128" rx="28" ry="28" fill="${decodeURIComponent(fill)}" opacity="0.9"/>` +
      `<text x="50%" y="54%" font-family="ui-sans-serif,system-ui" font-size="20" fill="rgba(255,255,255,0.90)" text-anchor="middle">${decodeURIComponent(text)}</text>` +
      `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function checkeredPlaceholderDataUri(label) {
    // Use Array.from to properly handle emoji (surrogate pairs) before truncating
    const text = encodeURIComponent(Array.from(String(label || "")).slice(0, 16).join(""));
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

  // Selected node state
  let selectedNodeId = null;

  // Shortest path mode
  let shortestPathMode = false;
  let lockedPathToId = null; // Persisted path target (from URL params)

  // Track original dataUrl for permalink (null if loaded via kitty IDs)
  let loadedFromDataUrl = null;

  const resolvedImgUrl = new Map();
  const nodeBaseStyle = new Map();
  const cachedApiResponses = new Map(); // Cache full API responses for later expansion

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
      size: 38,
      border: isMine ? "#7aa2ff" : (isUnknownColor ? "rgba(255,200,100,0.5)" : "rgba(255,255,255,0.22)"),
      borderWidth: isMine ? 2 : (isUnknownColor ? 2 : 1),
      gems: gems // Store gems for drawing
    };
    nodeBaseStyle.set(id, base);

    // Determine initial image:
    // - If node already exists with a resolved image, keep it
    // - If svgBaseUrl is set, use placeholder (resolveImageUrlForKitty will update)
    // - Otherwise, use API image_url if available, else placeholder
    const existingNode = nodes.get(id);
    const cachedImg = resolvedImgUrl.get(id);

    let initialImg;
    if (existingNode && cachedImg) {
      // Node already exists with resolved image - keep it
      initialImg = cachedImg;
    } else {
      const svgBaseEl = $("svgBaseUrl");
      const svgBaseUrl = (svgBaseEl && svgBaseEl.value ? svgBaseEl.value : "").trim();
      const willProbeLocal = !!svgBaseUrl;

      if (willProbeLocal) {
        // Use placeholder - resolveImageUrlForKitty will update with local or API image
        initialImg = isUnknownColor ? checkeredPlaceholderDataUri(nodeLabel(k)) : placeholderDataUri(nodeLabel(k), bg);
      } else {
        // No local probing, use API image directly if available
        initialImg = k.image_url || (isUnknownColor ? checkeredPlaceholderDataUri(nodeLabel(k)) : placeholderDataUri(nodeLabel(k), bg));
      }
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

    // Check for auction seller (real owner when on auction) - check nested raw too
    const auctionData = kk.auction || (kk.raw && kk.raw.auction) || null;
    const seller = kk.seller || (auctionData && auctionData.seller ? auctionData.seller : null);

    // Owner fields - prefer seller if on auction AND current owner is auction contract
    const currentOwnerAddr = kk.owner_address || normalizeOwner(kk.owner);
    const ownerIsAuctionContract = isAuctionContract(currentOwnerAddr);

    // DEBUG - log any kitty with auction contract owner
    if (ownerIsAuctionContract || seller) {
      console.log("DEBUG upsertKitty auction/seller:", {
        id: kk.id,
        "kk.auction": kk.auction,
        "kk.raw exists": !!kk.raw,
        "kk.raw?.auction": kk.raw?.auction,
        "auctionData": auctionData,
        "seller": seller,
        "currentOwnerAddr": currentOwnerAddr,
        "ownerIsAuctionContract": ownerIsAuctionContract,
        "kk.owner_address": kk.owner_address,
        "kk.owner_nickname": kk.owner_nickname
      });
    }

    if (seller && ownerIsAuctionContract) {
      // Replace auction contract with actual seller
      kk.owner_address = normalizeOwner(seller) || kk.owner_address;
      kk.owner_nickname = seller.nickname || seller.username || seller.name || kk.owner_nickname;
      kk.seller = seller;
      kk.auction = auctionData;
      kk.isOnAuction = auctionData && auctionData.status === "open";
    } else {
      if (!kk.owner_address) {
        kk.owner_address = normalizeOwner(kk.owner) || normalizeOwner(kk.owner_profile && kk.owner_profile.address) || normalizeOwner(kk.ownerProfile && kk.ownerProfile.address) || null;
      }
      if (!kk.owner_nickname) {
        kk.owner_nickname = normalizeOwnerNickname(kk);
      }
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

  // Check if a newly added kitty should connect to existing kitties
  // (i.e., existing kitties might have this new one as a parent)
  function checkNewConnections(newIds) {
    const newIdSet = new Set(newIds.map(Number));
    let connectionsFound = 0;

    for (const k of kittyById.values()) {
      // Skip the new kitties themselves
      if (newIdSet.has(k.id)) continue;

      // Check if this existing kitty has a parent that was just added
      if (k.matron_id && newIdSet.has(k.matron_id) && nodes.get(k.matron_id)) {
        const edgeId = `m:${k.matron_id}->${k.id}`;
        if (!edges.get(edgeId)) {
          edges.update({
            id: edgeId,
            from: k.matron_id,
            to: k.id,
            arrows: { to: { enabled: true, scaleFactor: 1.0, type: "arrow" } },
            width: 2,
            color: EDGE_COLORS.matron
          });
          log("New connection found: matron", k.matron_id, "->", k.id);
          connectionsFound++;
        }
      }
      if (k.sire_id && newIdSet.has(k.sire_id) && nodes.get(k.sire_id)) {
        const edgeId = `s:${k.sire_id}->${k.id}`;
        if (!edges.get(edgeId)) {
          edges.update({
            id: edgeId,
            from: k.sire_id,
            to: k.id,
            arrows: { to: { enabled: true, scaleFactor: 1.0, type: "arrow" } },
            width: 2,
            color: EDGE_COLORS.sire
          });
          log("New connection found: sire", k.sire_id, "->", k.id);
          connectionsFound++;
        }
      }
    }

    if (connectionsFound > 0) {
      log("checkNewConnections: found", connectionsFound, "new connections to existing nodes");
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

  // Find shortest path between two nodes using BFS
  // Returns array of node IDs in the path, or empty array if no path exists
  function findShortestPath(fromId, toId) {
    if (fromId === toId) return [fromId];

    const adj = buildAdjacency();
    if (!adj.has(fromId) || !adj.has(toId)) return [];

    const visited = new Set([fromId]);
    const queue = [[fromId]]; // Queue of paths

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      const neighbors = adj.get(current);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (neighbor === toId) {
          return [...path, neighbor];
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return []; // No path found
  }

  // Get edge IDs for a path of nodes
  function getPathEdgeIds(pathNodes) {
    const edgeIds = [];
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const a = pathNodes[i];
      const b = pathNodes[i + 1];
      // Check both directions for matron/sire edges
      const possibleIds = [
        `m:${a}->${b}`, `s:${a}->${b}`,
        `m:${b}->${a}`, `s:${b}->${a}`
      ];
      for (const edgeId of possibleIds) {
        if (edges.get(edgeId)) {
          edgeIds.push(edgeId);
          break;
        }
      }
    }
    return edgeIds;
  }

  // Highlight the shortest path between two nodes
  // Returns true if path was found and highlighted, false if no path exists
  function highlightShortestPath(fromId, toId) {
    const path = findShortestPath(fromId, toId);
    const pathExists = path.length > 0;

    if (!pathExists) {
      log("No path found between", fromId, "and", toId);
    } else {
      log("Shortest path:", path.join(" -> "));
    }

    const pathEdgeIds = pathExists ? new Set(getPathEdgeIds(path)) : new Set();
    const pathNodeIds = pathExists ? new Set(path) : new Set();

    // Update nodes - highlight path nodes, dim others
    const nodeUpdates = [];
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      const base = nodeBaseStyle.get(nid);
      if (!base) continue;

      if (nid === selectedNodeId) {
        // Selected node - keep selection styling
        nodeUpdates.push({
          id: nid,
          size: base.size + 6,
          color: { background: base.bg, border: "#ffffff" },
          borderWidth: 3
        });
      } else if (nid === toId) {
        // Target node - highlight even if no path (shows what we're hovering)
        nodeUpdates.push({
          id: nid,
          size: 50,
          color: { background: brightenHex(base.bg, 0.28), border: "#ffffff" },
          borderWidth: 3
        });
      } else if (pathNodeIds.has(nid)) {
        // Path node - bright white border to indicate path, enlarged
        nodeUpdates.push({
          id: nid,
          size: 46,
          color: { background: brightenHex(base.bg, 0.3), border: "#ffffff" },
          borderWidth: 3
        });
      } else {
        // Dim other nodes
        nodeUpdates.push({
          id: nid,
          size: base.size,
          color: { background: darkenColor(base.bg, 0.4), border: "rgba(255,255,255,0.05)" },
          borderWidth: 1
        });
      }
    }
    if (nodeUpdates.length) nodes.update(nodeUpdates);

    // Update edges - highlight path edges, dim all others
    const edgeUpdates = [];
    for (const edge of edges.get()) {
      if (pathEdgeIds.has(edge.id)) {
        // Path edge - use bright matron/sire colors
        const isMatron = edge.id.startsWith("m:");
        const pathColor = isMatron
          ? { color: "#ff40a0", highlight: "#ff60b0" }  // Bright pink for matron
          : { color: "#40a0ff", highlight: "#60b0ff" }; // Bright blue for sire
        edgeUpdates.push({
          id: edge.id,
          color: pathColor,
          width: 4,
          arrows: { to: { enabled: true, scaleFactor: 1.2, type: "arrow" } }
        });
      } else {
        // Dim all other edges (including when no path exists)
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

    return pathExists;
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

    log("fitMainCluster:", { totalNodes: nodes.length, mainSize: mainExisting.length, roots: myKittyIds.size, currentLayout });
    if (!mainExisting.length) return;

    const isLR = currentLayout === "hierarchicalLR";

    // For LR layouts, use manual bounding box calculation (vis-network fit is buggy for LR)
    if (isLR) {
      try {
        const positions = network.getPositions(mainExisting);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        for (const id of mainExisting) {
          const pos = positions[id];
          if (!pos) continue;
          if (pos.x < minX) minX = pos.x;
          if (pos.x > maxX) maxX = pos.x;
          if (pos.y < minY) minY = pos.y;
          if (pos.y > maxY) maxY = pos.y;
        }

        if (!isFinite(minX)) return;

        const padding = 100;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = (maxX - minX) + padding * 2;
        const height = (maxY - minY) + padding * 2;

        const canvas = network.canvas.frame.canvas;
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;

        const scaleX = canvasWidth / width;
        const scaleY = canvasHeight / height;
        const scale = Math.min(scaleX, scaleY, 1.5); // Cap at 1.5 max zoom

        log("fitMainCluster LR manual:", { centerX, centerY, width, height, scale });

        network.moveTo({
          position: { x: centerX, y: centerY },
          scale: scale,
          animation: { duration: 600, easingFunction: "easeInOutQuad" }
        });
      } catch (e) {
        log("fitMainCluster LR error:", e);
      }
      return;
    }

    // Standard fit for other layouts
    try {
      network.fit({
        nodes: mainExisting,
        animation: { duration: 600, easingFunction: "easeInOutQuad" }
      });

      // After fit completes, zoom in slightly and adjust view for visual balance
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

    // Just toggle physics on/off - don't reset solver settings
    // This preserves current node positions when re-enabling
    network.setOptions({ physics: { enabled: physicsOn } });

    const btn = $("togglePhysicsBtn");
    if (btn) btn.textContent = `Physics: ${physicsOn ? "on" : "off"}`;
  }

  // Current layout mode
  let currentLayout = "clustered";

  // Physics solver configurations
  const PHYSICS_SOLVERS = {
    clustered: {
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
    physics: {
      solver: "forceAtlas2Based",
      forceAtlas2Based: {
        gravitationalConstant: -120,
        centralGravity: 0.002,
        springLength: 120,
        springConstant: 0.06,
        damping: 0.4,
        avoidOverlap: 0.9
      }
    },
    barnesHut: {
      solver: "barnesHut",
      barnesHut: {
        gravitationalConstant: -8000,
        centralGravity: 0.3,
        springLength: 120,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 0.5
      }
    },
    repulsion: {
      solver: "repulsion",
      repulsion: {
        nodeDistance: 150,
        centralGravity: 0.2,
        springLength: 200,
        springConstant: 0.05,
        damping: 0.09
      }
    }
  };

  function setLayout(layoutType) {
    if (!network) return;
    currentLayout = layoutType;
    log("setLayout:", layoutType);

    // Recreate network with new layout - this is the most reliable approach
    renderNetworkWithLayout(layoutType);
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

    // Extract auction info - check both direct and nested raw
    const auctionData = raw.auction || (raw.raw && raw.raw.auction) || null;
    const auction = auctionData && typeof auctionData === "object" && auctionData.type ? auctionData : null;
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
      // Check cache first before making API call
      let kObj;
      if (cachedApiResponses.has(id)) {
        log("expandFamily: using cached API response for", id);
        kObj = cachedApiResponses.get(id);
        cachedApiResponses.delete(id); // Clear from cache after use
      } else {
        const kitty = await fetchJson(apiUrl(`/kitties/${id}`));
        kObj = unwrapKitty(kitty);
      }

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
      // Note: embedded children don't have matron_id/sire_id fields
      // If pre-fetch is enabled, fetch full details for accurate parent info
      if (Array.isArray(kObj.children) && kObj.children.length > 0) {
        const shouldPrefetch = wantPrefetchChildren();
        const shouldAutoConnect = wantAutoConnect();
        log("expandFamily: extracting", kObj.children.length, "embedded children, prefetch:", shouldPrefetch, "autoConnect:", shouldAutoConnect);

        // Track IDs we're adding in this expansion (to check for new connections)
        const addingIds = new Set(kittiesToAdd.map(k => k.id));
        // IDs to check for auto-connect (embedded relatives of pre-fetched children)
        const autoConnectCandidates = new Map(); // id -> embedded data

        for (const child of kObj.children) {
          if (child && typeof child === "object" && child.id) {
            const childId = Number(child.id);

            // Skip if already in graph with both parents known
            const existing = kittyById.get(childId);
            if (existing && existing.matron_id && existing.sire_id) {
              log("expandFamily: child", childId, "already has both parents, skipping");
              continue;
            }

            let normalized;
            let childObj = null;
            if (shouldPrefetch) {
              // Fetch full details from API for accurate parent IDs
              try {
                log("expandFamily: pre-fetching child", childId);
                const childData = await fetchJson(apiUrl(`/kitties/${childId}`));
                childObj = unwrapKitty(childData);
                normalized = normalizeFromApi(childObj);

                // Cache the full API response for later expansion (don't create nodes yet)
                cachedApiResponses.set(childId, childObj);
                log("expandFamily: cached API response for child", childId);

                // If auto-connect enabled, collect embedded relatives for later checking
                if (shouldAutoConnect && childObj) {
                  // Check embedded parents - might connect to existing nodes
                  if (childObj.matron && childObj.matron.id) {
                    const matronId = Number(childObj.matron.id);
                    if (!kittyById.has(matronId) && !addingIds.has(matronId)) {
                      autoConnectCandidates.set(matronId, childObj.matron);
                    }
                  }
                  if (childObj.sire && childObj.sire.id) {
                    const sireId = Number(childObj.sire.id);
                    if (!kittyById.has(sireId) && !addingIds.has(sireId)) {
                      autoConnectCandidates.set(sireId, childObj.sire);
                    }
                  }
                  // Check embedded children - might have parents in existing graph
                  if (Array.isArray(childObj.children)) {
                    for (const grandchild of childObj.children) {
                      if (grandchild && grandchild.id) {
                        const gcId = Number(grandchild.id);
                        if (!kittyById.has(gcId) && !addingIds.has(gcId)) {
                          autoConnectCandidates.set(gcId, grandchild);
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                log("expandFamily: pre-fetch failed for", childId, e);
                // Fall back to embedded data with guessed parent
                normalized = normalizeFromApi(child);
                if (!normalized.matron_id) normalized.matron_id = id;
                else if (!normalized.sire_id) normalized.sire_id = id;
              }
            } else {
              // Use embedded data - have to guess which parent the expanded kitty is
              normalized = normalizeFromApi(child);

              // Only set parent reference for NEW kitties (not already in graph)
              if (!existing) {
                if (!normalized.matron_id) normalized.matron_id = id;
                else if (!normalized.sire_id) normalized.sire_id = id;
              } else {
                // Kitty exists - add the OTHER parent if missing
                if (existing.matron_id && !existing.sire_id) {
                  normalized.sire_id = id;
                } else if (existing.sire_id && !existing.matron_id) {
                  normalized.matron_id = id;
                }
                // If both parents known, don't change anything
              }
            }
            kittiesToAdd.push(normalized);
            addingIds.add(normalized.id);
          }
        }

        // Process auto-connect candidates - add relatives that connect to existing nodes
        if (shouldAutoConnect && autoConnectCandidates.size > 0) {
          log("expandFamily: checking", autoConnectCandidates.size, "auto-connect candidates");
          const existingIds = new Set(kittyById.keys());

          for (const [candidateId, embeddedData] of autoConnectCandidates) {
            // Skip if we already added this one
            if (addingIds.has(candidateId)) continue;

            // Pre-fetch to get accurate parent info
            try {
              log("expandFamily: auto-connect pre-fetching", candidateId);
              const candidateData = await fetchJson(apiUrl(`/kitties/${candidateId}`));
              const candidateObj = unwrapKitty(candidateData);
              const normalized = normalizeFromApi(candidateObj);

              // Check if this candidate connects to existing nodes (not ones we're adding)
              const connectsToMatron = normalized.matron_id && existingIds.has(normalized.matron_id);
              const connectsToSire = normalized.sire_id && existingIds.has(normalized.sire_id);

              if (connectsToMatron || connectsToSire) {
                log("expandFamily: auto-connect adding", candidateId, "connects to existing:",
                    connectsToMatron ? normalized.matron_id : null,
                    connectsToSire ? normalized.sire_id : null);
                kittiesToAdd.push(normalized);
                addingIds.add(normalized.id);
              }
            } catch (e) {
              log("expandFamily: auto-connect pre-fetch failed for", candidateId, e);
            }
          }
        }
      }

      log("expandFamily api merge:", { id, totalKitties: kittiesToAdd.length });
      mergeJson({ root_ids: [id], kitties: kittiesToAdd }, true); // animate new nodes

      rebuildAllEdges(); // Create edges now that all nodes exist
      setStats();
      updateFilterControls();
      log("expandFamily post-merge:", { nodes: nodes.length, edges: edges.length });

      // Run physics stabilization to rearrange nodes (don't fit - keep current view)
      network.setOptions({
        physics: {
          enabled: true,
          stabilization: { enabled: true, iterations: 200, updateInterval: 25, fit: false }
        }
      });
      network.stabilize();
      physicsOn = true;
      const physBtn = $("togglePhysicsBtn");
      if (physBtn) physBtn.textContent = "Physics: on";

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

  // Check if a kitty's owner matches the given address/nickname
  function doesKittyMatchOwner(k, ownerAddrLower, ownerNickLower) {
    if (!ownerAddrLower && !ownerNickLower) return false;

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

    return matched;
  }

  function highlightOwnerKitties(ownerAddr, ownerNick) {
    if (!ownerAddr && !ownerNick) return;
    const ownedIds = new Set();
    const ownerAddrLower = ownerAddr ? ownerAddr.toLowerCase() : null;
    const ownerNickLower = ownerNick ? ownerNick.toLowerCase() : null;

    // Find all kitties owned by this address OR nickname
    for (const [id, k] of kittyById.entries()) {
      if (doesKittyMatchOwner(k, ownerAddrLower, ownerNickLower)) {
        ownedIds.add(id);
      }
    }

    log("highlightOwnerKitties:", { ownerAddr, ownerNick, count: ownedIds.size, ids: Array.from(ownedIds) });

    // Highlight owned nodes, dim others (but preserve selection styling)
    const nodeUpdates = [];
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      const base = nodeBaseStyle.get(nid);
      if (!base) continue;

      // Selected node keeps selection styling
      if (nid === selectedNodeId) {
        nodeUpdates.push({
          id: nid,
          size: base.size + 6,
          color: { background: base.bg, border: "#ffffff" },
          borderWidth: 3
        });
      } else if (ownedIds.has(nid)) {
        nodeUpdates.push({
          id: nid,
          size: 48,
          color: { background: brightenHex(base.bg, 0.25), border: "#7aa2ff" },
          borderWidth: 3
        });
      } else {
        nodeUpdates.push({
          id: nid,
          size: base.size,
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

  // Highlight kitties that have a specific trait value
  function highlightByTrait(traitValue) {
    if (!traitValue) return;
    const traitLower = traitValue.toLowerCase();
    const matchingIds = new Set();

    // Find all kitties with this trait value
    for (const [id, k] of kittyById.entries()) {
      const traits = k.traits || {};
      for (const val of Object.values(traits)) {
        if (val && val.toLowerCase() === traitLower) {
          matchingIds.add(id);
          break;
        }
      }
    }

    log("highlightByTrait:", { traitValue, count: matchingIds.size });

    // Highlight matching nodes, dim others (preserve selection styling)
    const nodeUpdates = [];
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      const base = nodeBaseStyle.get(nid);
      if (!base) continue;

      if (nid === selectedNodeId) {
        nodeUpdates.push({
          id: nid,
          size: base.size + 6,
          color: { background: base.bg, border: "#ffffff" },
          borderWidth: 3
        });
      } else if (matchingIds.has(nid)) {
        nodeUpdates.push({
          id: nid,
          size: 48,
          color: { background: brightenHex(base.bg, 0.25), border: "#ffcc00" },
          borderWidth: 3
        });
      } else {
        nodeUpdates.push({
          id: nid,
          size: base.size,
          color: { background: base.bg, border: "rgba(255,255,255,0.1)" },
          borderWidth: 1
        });
      }
    }
    if (nodeUpdates.length) nodes.update(nodeUpdates);

    // Dim edges not between matching kitties
    const edgeUpdates = [];
    for (const edge of edges.get()) {
      const match = edge.id.match(/^([ms]):(\d+)->(\d+)$/);
      if (match) {
        const fromId = Number(match[2]);
        const toId = Number(match[3]);
        const dimColor = edge.id.startsWith("m:") ? EDGE_COLORS.matronDimmed : EDGE_COLORS.sireDimmed;

        if (matchingIds.has(fromId) && matchingIds.has(toId)) {
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
      }
    }
    if (edgeUpdates.length) edges.update(edgeUpdates);
  }

  // Filter state
  let filterEdgeHighlight = false; // Whether to highlight edges between filtered kitties

  // Generation highlight state
  let generationHighlightActive = false;
  let generationRangeMin = null;
  let generationRangeMax = null;

  function getAvailableGenerations() {
    const gens = new Set();
    for (const k of kittyById.values()) {
      if (typeof k.generation === "number") {
        gens.add(k.generation);
      }
    }
    return Array.from(gens).sort((a, b) => a - b);
  }

  function highlightByGenerationRange(minGen, maxGen) {
    // If both null/undefined, clear filter
    if ((minGen === null || minGen === undefined || minGen === "") &&
        (maxGen === null || maxGen === undefined || maxGen === "")) {
      generationHighlightActive = false;
      generationRangeMin = null;
      generationRangeMax = null;
      applyFilterHighlighting(); // Use unified function
      return;
    }

    generationHighlightActive = true;
    generationRangeMin = (minGen !== null && minGen !== undefined && minGen !== "") ? Number(minGen) : null;
    generationRangeMax = (maxGen !== null && maxGen !== undefined && maxGen !== "") ? Number(maxGen) : null;

    log("highlightByGenerationRange:", { min: generationRangeMin, max: generationRangeMax });
    applyFilterHighlighting(); // Use unified function
  }

  // Mewtation highlight state
  let mewtationHighlightActive = false;
  let highlightedGemTypes = new Set(); // empty = all gems

  // Combined filter matching - returns true if kitty matches ALL active filters
  function doesKittyMatchAllFilters(k) {
    if (!k) return false;

    // Check generation filter
    if (generationHighlightActive) {
      if (typeof k.generation !== "number") return false;
      const inRange =
        (generationRangeMin === null || k.generation >= generationRangeMin) &&
        (generationRangeMax === null || k.generation <= generationRangeMax);
      if (!inRange) return false;
    }

    // Check mewtation filter
    if (mewtationHighlightActive) {
      const gems = getMewtationGems(k);
      if (gems.length === 0) return false;
      if (highlightedGemTypes.size > 0) {
        // Must have at least one matching gem type
        let hasMatchingGem = false;
        for (const gem of gems) {
          if (highlightedGemTypes.has(gem.gem)) {
            hasMatchingGem = true;
            break;
          }
        }
        if (!hasMatchingGem) return false;
      }
    }

    return true;
  }

  // Get all kitty IDs that match the combined active filters
  function getFilteredKittyIds() {
    const matchingIds = new Set();
    for (const [id, k] of kittyById.entries()) {
      if (doesKittyMatchAllFilters(k)) {
        matchingIds.add(id);
      }
    }
    return matchingIds;
  }

  // Apply combined filter highlighting to all nodes and edges
  function applyFilterHighlighting() {
    const filterActive = generationHighlightActive || mewtationHighlightActive;

    if (!filterActive) {
      restoreAllNodes();
      return;
    }

    const matchingIds = getFilteredKittyIds();
    log("applyFilterHighlighting:", {
      generationActive: generationHighlightActive,
      mewtationActive: mewtationHighlightActive,
      matchingCount: matchingIds.size
    });

    // Highlight matching nodes, dim others
    const nodeUpdates = [];
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      const base = nodeBaseStyle.get(nid);
      if (!base) continue;

      // Check if this kitty belongs to the pinned owner
      const k = kittyById.get(nid);
      let isOwnedByPinned = false;
      if (ownerHighlightLocked && (lockedOwnerAddr || lockedOwnerNick) && k) {
        const ownerAddrLower = lockedOwnerAddr ? lockedOwnerAddr.toLowerCase() : null;
        const ownerNickLower = lockedOwnerNick ? lockedOwnerNick.toLowerCase() : null;
        isOwnedByPinned = doesKittyMatchOwner(k, ownerAddrLower, ownerNickLower);
      }

      if (nid === selectedNodeId) {
        nodeUpdates.push({
          id: nid,
          size: base.size + 6,
          color: { background: base.bg, border: "#ffffff" },
          borderWidth: 3
        });
      } else if (matchingIds.has(nid)) {
        // Determine border color based on active filters
        let borderColor = "#ffcc00"; // Default yellow for generation

        // If mewtation filter is active, use gem-specific color
        if (mewtationHighlightActive && k) {
          const gems = getMewtationGems(k);
          if (gems.length > 0) {
            const topGem = [...gems].sort((a, b) => {
              const priority = { diamond: 4, gold: 3, silver: 2, bronze: 1 };
              return (priority[b.gem] || 0) - (priority[a.gem] || 0);
            })[0];
            const gemColors = {
              diamond: "#00ffff",
              gold: "#ffd700",
              silver: "#c0c0c0",
              bronze: "#cd7f32"
            };
            borderColor = gemColors[topGem?.gem] || borderColor;
          }
        }

        nodeUpdates.push({
          id: nid,
          size: mewtationHighlightActive ? 48 : 46,
          color: { background: brightenHex(base.bg, mewtationHighlightActive ? 0.25 : 0.2), border: borderColor },
          borderWidth: mewtationHighlightActive ? 3 : 2
        });
      } else {
        // Dim non-matching nodes - darkened background (preserve owner indication)
        nodeUpdates.push({
          id: nid,
          size: base.size,
          color: {
            background: darkenColor(base.bg, isOwnedByPinned ? 0.25 : 0.4),
            border: isOwnedByPinned ? "#7aa2ff" : "rgba(255,255,255,0.05)"
          },
          borderWidth: isOwnedByPinned ? 2 : 1
        });
      }
    }
    if (nodeUpdates.length) nodes.update(nodeUpdates);

    // Handle edges based on filterEdgeHighlight toggle
    if (filterEdgeHighlight) {
      const edgeUpdates = [];
      for (const edge of edges.get()) {
        const match = edge.id.match(/^([ms]):(\d+)->(\d+)$/);
        if (match) {
          const fromId = Number(match[2]);
          const toId = Number(match[3]);
          const dimColor = edge.id.startsWith("m:") ? EDGE_COLORS.matronDimmed : EDGE_COLORS.sireDimmed;

          if (matchingIds.has(fromId) && matchingIds.has(toId)) {
            // Highlight edges between filtered kitties
            edgeUpdates.push({
              id: edge.id,
              color: getEdgeColor(edge.id),
              width: 2,
              arrows: { to: { enabled: true, scaleFactor: 1.0, type: "arrow" } }
            });
          } else {
            // Dim other edges
            edgeUpdates.push({
              id: edge.id,
              color: dimColor,
              width: 1.5,
              arrows: { to: { enabled: true, scaleFactor: 0.5 } }
            });
          }
        }
      }
      if (edgeUpdates.length) edges.update(edgeUpdates);
    } else {
      // Filter edge highlight unchecked - preserve selected/owner edges
      if (selectedNodeId) {
        highlightFamilyEdges(selectedNodeId);
      } else {
        reapplyOwnerEdges();
      }
    }
  }

  function getAvailableMewtationGems() {
    const gems = new Set();
    for (const k of kittyById.values()) {
      const kittyGems = getMewtationGems(k);
      for (const gem of kittyGems) {
        gems.add(gem.gem);
      }
    }
    return gems;
  }

  function updateMewtationFilterButtons() {
    const availableGems = getAvailableMewtationGems();
    const hasAnyGems = availableGems.size > 0;

    const mewtationBtns = {
      all: $("mewtationFilterAll"),
      diamond: $("mewtationFilterDiamond"),
      gold: $("mewtationFilterGold"),
      silver: $("mewtationFilterSilver"),
      bronze: $("mewtationFilterBronze")
    };

    // Enable/disable "All" button based on whether any gems exist
    if (mewtationBtns.all) {
      mewtationBtns.all.disabled = !hasAnyGems;
    }

    // Enable/disable individual gem buttons based on availability
    ["diamond", "gold", "silver", "bronze"].forEach(gemType => {
      const btn = mewtationBtns[gemType];
      if (btn) {
        btn.disabled = !availableGems.has(gemType);
        // If button was active but gem type no longer available, deactivate it
        if (btn.disabled && btn.classList.contains("active")) {
          btn.classList.remove("active");
        }
      }
    });

    log("updateMewtationFilterButtons:", { available: Array.from(availableGems) });
  }

  function highlightMewtations(gemTypes = null) {
    if (gemTypes === null || gemTypes === false) {
      mewtationHighlightActive = false;
      highlightedGemTypes.clear();
      applyFilterHighlighting(); // Use unified function
      return;
    }

    mewtationHighlightActive = true;
    highlightedGemTypes = gemTypes === true ? new Set() : new Set(gemTypes);

    log("highlightMewtations:", { gemTypes: highlightedGemTypes.size ? Array.from(highlightedGemTypes) : "all" });
    applyFilterHighlighting(); // Use unified function
  }

  // Reapply edge highlighting for the currently active filter
  function reapplyFilterEdges() {
    if (!filterEdgeHighlight) return false;

    const filterActive = generationHighlightActive || mewtationHighlightActive;
    if (!filterActive) return false;

    const matchingIds = getFilteredKittyIds();
    if (matchingIds.size === 0) return false;

    // Apply edge highlighting
    const edgeUpdates = [];
    for (const edge of edges.get()) {
      const match = edge.id.match(/^([ms]):(\d+)->(\d+)$/);
      if (match) {
        const fromId = Number(match[2]);
        const toId = Number(match[3]);
        const dimColor = edge.id.startsWith("m:") ? EDGE_COLORS.matronDimmed : EDGE_COLORS.sireDimmed;

        if (matchingIds.has(fromId) && matchingIds.has(toId)) {
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
      }
    }
    if (edgeUpdates.length) edges.update(edgeUpdates);
    return true;
  }

  // Get the correct node style based on active filters
  // Returns null if no filter is active
  function getFilteredNodeStyle(nid) {
    const filterActive = generationHighlightActive || mewtationHighlightActive;
    if (!filterActive) return null;

    const base = nodeBaseStyle.get(nid);
    if (!base) return null;

    const k = kittyById.get(nid);

    // Check if this kitty belongs to the pinned owner
    let isOwnedByPinned = false;
    if (ownerHighlightLocked && (lockedOwnerAddr || lockedOwnerNick) && k) {
      const ownerAddrLower = lockedOwnerAddr ? lockedOwnerAddr.toLowerCase() : null;
      const ownerNickLower = lockedOwnerNick ? lockedOwnerNick.toLowerCase() : null;
      isOwnedByPinned = doesKittyMatchOwner(k, ownerAddrLower, ownerNickLower);
    }

    // Check if kitty matches all active filters
    const matches = doesKittyMatchAllFilters(k);

    if (matches) {
      // Determine border color based on active filters
      let borderColor = "#ffcc00"; // Default yellow for generation

      // If mewtation filter is active, use gem-specific color
      if (mewtationHighlightActive && k) {
        const gems = getMewtationGems(k);
        if (gems.length > 0) {
          const topGem = [...gems].sort((a, b) => {
            const priority = { diamond: 4, gold: 3, silver: 2, bronze: 1 };
            return (priority[b.gem] || 0) - (priority[a.gem] || 0);
          })[0];
          const gemColors = {
            diamond: "#00ffff",
            gold: "#ffd700",
            silver: "#c0c0c0",
            bronze: "#cd7f32"
          };
          borderColor = gemColors[topGem?.gem] || borderColor;
        }
      }

      return {
        id: nid,
        size: mewtationHighlightActive ? 48 : 46,
        color: { background: brightenHex(base.bg, mewtationHighlightActive ? 0.25 : 0.2), border: borderColor },
        borderWidth: mewtationHighlightActive ? 3 : 2
      };
    } else {
      // Dim non-matching (but preserve owner indication)
      return {
        id: nid,
        size: base.size,
        color: {
          background: darkenColor(base.bg, isOwnedByPinned ? 0.25 : 0.4),
          border: isOwnedByPinned ? "#7aa2ff" : "rgba(255,255,255,0.05)"
        },
        borderWidth: isOwnedByPinned ? 2 : 1
      };
    }
  }

  // Restore edges based on owner highlighting (without touching nodes)
  function reapplyOwnerEdges() {
    if (!ownerHighlightLocked || (!lockedOwnerAddr && !lockedOwnerNick)) {
      restoreEdgeColors();
      return;
    }

    const ownedIds = new Set();
    const ownerAddrLower = lockedOwnerAddr ? lockedOwnerAddr.toLowerCase() : null;
    const ownerNickLower = lockedOwnerNick ? lockedOwnerNick.toLowerCase() : null;

    for (const [id, k] of kittyById.entries()) {
      if (doesKittyMatchOwner(k, ownerAddrLower, ownerNickLower)) {
        ownedIds.add(id);
      }
    }

    const edgeUpdates = [];
    for (const edge of edges.get()) {
      const match = edge.id.match(/^([ms]):(\d+)->(\d+)$/);
      if (match) {
        const fromId = Number(match[2]);
        const toId = Number(match[3]);
        const dimColor = edge.id.startsWith("m:") ? EDGE_COLORS.matronDimmed : EDGE_COLORS.sireDimmed;

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
      }
    }
    if (edgeUpdates.length) edges.update(edgeUpdates);
  }

  // Reapply all filter styling to all nodes (used when deselecting)
  function reapplyFilterNodes() {
    if (!generationHighlightActive && !mewtationHighlightActive) return false;

    const nodeUpdates = [];
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      const style = getFilteredNodeStyle(nid);
      if (style) {
        nodeUpdates.push(style);
      }
    }
    if (nodeUpdates.length) nodes.update(nodeUpdates);
    return true;
  }

  function restoreAllNodes() {
    // If owner highlight is pinned, restore that instead of base styles
    if (ownerHighlightLocked && (lockedOwnerAddr || lockedOwnerNick)) {
      highlightOwnerKitties(lockedOwnerAddr, lockedOwnerNick);
      return;
    }

    // Save current view to prevent zoom jitter during batch updates
    const currentScale = network ? network.getScale() : null;
    const currentPosition = network ? network.getViewPosition() : null;

    const nodeUpdates = [];
    for (const id of nodes.getIds()) {
      const nid = Number(id);
      const base = nodeBaseStyle.get(nid);
      if (!base) continue;
      // Preserve selection styling
      if (nid === selectedNodeId) {
        nodeUpdates.push({
          id: nid,
          size: base.size + 6,
          color: { background: base.bg, border: "#ffffff" },
          borderWidth: 3
        });
      } else {
        nodeUpdates.push({
          id: nid,
          size: base.size,
          color: { background: base.bg, border: base.border },
          borderWidth: base.borderWidth
        });
      }
    }
    if (nodeUpdates.length) nodes.update(nodeUpdates);
    restoreEdgeColors();

    // Restore view position after updates
    if (network && currentScale !== null && currentPosition !== null) {
      network.moveTo({ scale: currentScale, position: currentPosition, animation: false });
    }
  }

  function applySelectionStyle(id) {
    const base = nodeBaseStyle.get(id);
    if (!base) return;
    nodes.update({
      id,
      size: base.size + 6,
      color: { background: base.bg, border: "#ffffff" },
      borderWidth: 3
    });
  }

  function clearSelectionStyle(id) {
    if (!id) return;
    const base = nodeBaseStyle.get(id);
    if (!base) return;
    nodes.update({
      id,
      size: base.size,
      color: { background: base.bg, border: base.border },
      borderWidth: base.borderWidth
    });
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
          <img src="${GEM_IMAGES[g.gem]}" alt="${g.gem}" class="gem-icon gem-icon-md" />
        </span>`
      ).join("");
    }

    // Full version for right pane
    return sortedGems.map(g =>
      `<div class="gem-item">
        <img src="${GEM_IMAGES[g.gem]}" alt="${g.gem}" class="gem-icon gem-icon-lg" />
        <span class="gem-label">${gemDisplayName(g.gem)}</span>
        <span class="gem-detail">${safeText(g.type)}: <a href="${cattributeUrl(g.description)}" target="_blank" rel="noopener" class="trait-link">${safeText(g.description)}</a> (#${g.position})</span>
      </div>`
    ).join("");
  }

  function showTooltip(id, event, pathInfo = null) {
    if (!tooltipEl) return;
    const k = kittyById.get(id);
    if (!k) return;

    const img = k.image_url || "";
    const title = safeText(k.name || `Kitty ${k.id}`);
    let sub = `#${k.id}` + (typeof k.generation === "number" ? ` · Gen ${k.generation}` : "");

    // Add path info if in shortest path mode
    if (pathInfo) {
      if (pathInfo.hops === 0) {
        sub += ` · <span style="color:#7aa2ff">Selected</span>`;
      } else if (pathInfo.hops > 0) {
        const hopWord = pathInfo.hops === 1 ? "hop" : "hops";
        sub += ` · <span style="color:#7aa2ff">${pathInfo.hops} ${hopWord}</span>`;
      } else {
        sub += ` · <span style="color:#ff6b6b">No path</span>`;
      }
    }

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

    // Position tooltip in top-left area (away from floating panel on right)
    tooltipEl.style.display = "block";
    const ttRect = tooltipEl.getBoundingClientRect();

    // Fixed position in top-left with margin
    const x = 16;
    const y = 16;

    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = "none";
  }

  // Context menu handling
  const contextMenuEl = $("contextMenu");
  let contextMenuNodeId = null;

  function showContextMenu(nodeId, event) {
    if (!contextMenuEl) return;
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
      // Use comprehensive matching to check if this kitty's owner is the locked owner
      const isSameOwner = ownerHighlightLocked && doesKittyMatchOwner(k,
        lockedOwnerAddr ? lockedOwnerAddr.toLowerCase() : null,
        lockedOwnerNick ? lockedOwnerNick.toLowerCase() : null
      );

      // Add/remove active class for bright icon
      if (isSameOwner) {
        highlightItem.classList.add("active");
      } else {
        highlightItem.classList.remove("active");
      }

      const textSpan = highlightItem.querySelector(".menu-text");
      if (textSpan) {
        textSpan.textContent = isSameOwner ? "Unhighlight owner" : "Highlight owner";
      }

      // Update icon to show highlighted state
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
    const container = $("networkWrap");
    const containerRect = container.getBoundingClientRect();
    let x = event.pointer.DOM.x;
    let y = event.pointer.DOM.y;

    // Keep menu within container bounds
    contextMenuEl.style.display = "block";
    const menuRect = contextMenuEl.getBoundingClientRect();
    if (x + menuRect.width > containerRect.width) {
      x = containerRect.width - menuRect.width - 10;
    }
    if (y + menuRect.height > containerRect.height) {
      y = containerRect.height - menuRect.height - 10;
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

  function handleContextMenuAction(action) {
    const nodeId = contextMenuNodeId;
    hideContextMenu();

    if (!nodeId) return;
    const k = kittyById.get(nodeId);
    if (!k) return;

    log("contextMenuAction:", action, "for node", nodeId);

    switch (action) {
      case "center":
        if (network) {
          const pos = network.getPosition(nodeId);
          if (pos) {
            network.moveTo({
              position: { x: pos.x, y: pos.y - 40 },
              animation: { duration: 400, easingFunction: "easeInOutQuad" }
            });
          }
        }
        break;

      case "expand":
        expandFamily(nodeId);
        break;

      case "highlightOwner":
        const ownerAddr = k.owner_address || normalizeOwner(k.owner) || null;
        const ownerNick = k.owner_nickname || normalizeOwnerNickname(k) || null;
        if (ownerAddr || ownerNick) {
          // Check if this kitty's owner is already highlighted - toggle off if so
          // Use comprehensive matching to handle all owner data formats
          const isSameOwner = ownerHighlightLocked && doesKittyMatchOwner(k,
            lockedOwnerAddr ? lockedOwnerAddr.toLowerCase() : null,
            lockedOwnerNick ? lockedOwnerNick.toLowerCase() : null
          );

          if (isSameOwner) {
            // Unhighlight
            ownerHighlightLocked = false;
            lockedOwnerAddr = null;
            lockedOwnerNick = null;
            restoreAllNodes();
            setStatus("Owner highlight cleared", false);
          } else {
            // Highlight and pin
            ownerHighlightLocked = true;
            lockedOwnerAddr = ownerAddr;
            lockedOwnerNick = ownerNick;
            highlightOwnerKitties(ownerAddr, ownerNick);
            setStatus(`Highlighted owner: ${ownerNick || shortAddr(ownerAddr)}`, false);
          }
          // Refresh sidebar to update pin button state
          if (selectedNodeId) {
            showSelected(selectedNodeId);
          }
        } else {
          setStatus("No owner information for this kitty", false);
        }
        break;

      case "openOwner":
        const openOwnerAddr = k.owner_address || normalizeOwner(k.owner) || null;
        if (openOwnerAddr) {
          window.open(ownerUrl(openOwnerAddr), "_blank");
        } else {
          setStatus("No owner address for this kitty", false);
        }
        break;

      case "startFresh":
        // Clear graph completely and load just this kitty
        nodes.clear();
        edges.clear();
        kittyById.clear();
        expandedIds.clear();
        resolvedImgUrl.clear();
        nodeBaseStyle.clear();
        cachedApiResponses.clear();
        myKittyIds.clear();
        selectedNodeId = null;
        ownerHighlightLocked = false;
        lockedOwnerAddr = null;
        lockedOwnerNick = null;
        loadedFromDataUrl = null;
        shortestPathMode = false;
        lockedPathToId = null;
        const spToggle = $("shortestPathMode");
        if (spToggle) spToggle.checked = false;
        loadKittiesById([nodeId]);
        break;

      case "copyId":
        navigator.clipboard.writeText(String(nodeId)).then(() => {
          setStatus(`Copied kitty ID: ${nodeId}`, false);
        }).catch(() => {
          setStatus("Failed to copy to clipboard", true);
        });
        break;

      case "openCK":
        window.open(kittyUrl(nodeId), "_blank");
        break;
    }
  }

  // Wire up context menu click handlers
  if (contextMenuEl) {
    contextMenuEl.addEventListener("click", (e) => {
      const item = e.target.closest(".context-menu-item");
      if (item && item.dataset.action) {
        handleContextMenuAction(item.dataset.action);
      }
    });

    // Hide menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!contextMenuEl.contains(e.target)) {
        hideContextMenu();
      }
    });
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

    // Get owner address - prefer k.owner_address (may have been set from seller) over k.owner
    const rawOwnerAddr = k.owner_address || normalizeOwner(k.owner) || k.owner_wallet_address || null;
    const ownerIsContract = isAuctionContract(rawOwnerAddr);

    // Determine display owner
    // Priority: seller info (if on auction) > owner info > hatcher > nothing
    let displayOwnerAddr, displayOwnerNick, showAuctionStatus;
    let auctionContractName = null; // Track contract name when owner is auction contract with unknown real owner

    if (isOnAuction && seller) {
      // Actively on auction with seller info
      displayOwnerAddr = normalizeOwner(seller) || null;
      displayOwnerNick = seller.nickname || seller.username || seller.name || null;
      showAuctionStatus = true;
    } else if (isOnAuction) {
      // On auction but no seller info - show "On Auction"
      displayOwnerAddr = null;
      displayOwnerNick = null;
      showAuctionStatus = true;
    } else if (ownerIsContract) {
      // Owner is auction contract but NOT actively on auction - try to find real owner
      const ownerNick = normalizeOwnerNickname(k);
      const ownerObj = k.owner || k.owner_profile || k.raw?.owner || k.raw?.owner_profile;
      let ownerAddr = ownerObj && typeof ownerObj === "object" ? (ownerObj.address || ownerObj.wallet_address) : null;

      // If the address is also the contract, ignore it
      if (ownerAddr && isAuctionContract(ownerAddr)) {
        ownerAddr = null;
      }

      // Try hatcher as fallback
      if (!ownerNick && !ownerAddr) {
        const hatcher = k.hatcher || k.raw?.hatcher;
        if (hatcher && typeof hatcher === "object") {
          ownerAddr = normalizeOwner(hatcher);
          displayOwnerNick = hatcher.nickname || hatcher.username || hatcher.name || null;
          if (!isAuctionContract(ownerAddr)) {
            displayOwnerAddr = ownerAddr || null;
          }
        }
      }

      // Use whatever we found
      if (displayOwnerAddr === undefined) {
        displayOwnerAddr = ownerAddr || null;
        displayOwnerNick = displayOwnerNick || ownerNick || null;
      }

      // If still no owner info, we only know the auction contract - don't show it as a real owner
      // Instead show as "unknown" with auction context
      if (!displayOwnerAddr && !displayOwnerNick) {
        displayOwnerAddr = null; // Don't use contract address for owner highlighting
        displayOwnerNick = null;
        showAuctionStatus = true; // Show "On Auction" indicator instead of contract name
        auctionContractName = getContractName(rawOwnerAddr); // Remember which auction type
      } else {
        showAuctionStatus = false;
      }
    } else {
      // Normal case - use owner info directly
      displayOwnerAddr = rawOwnerAddr;
      displayOwnerNick = k.owner_nickname || normalizeOwnerNickname(k) || null;
      showAuctionStatus = false;
    }

    // If we have an address but no nickname, look it up from other kitties in the graph
    if (displayOwnerAddr && !displayOwnerNick) {
      displayOwnerNick = lookupOwnerNickname(displayOwnerAddr);
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
      const btnTitle = isLocked ? "Unhighlight owner" : "Highlight owner";
      const btnClass = isLocked ? "owner-highlight-btn active" : "owner-highlight-btn";
      // User icon with highlight rays when active
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
      // Icon on left, then owner link
      ownerHtml = `<span class="owner-row">
        <button class="${btnClass}" ${dataOwner} ${dataNick} title="${btnTitle}">${highlightIcon}</button>
        <a href="${linkHref}" target="_blank" rel="noopener" class="owner-link" ${dataOwner} ${dataNick}>${safeText(ownerText)}</a>
      </span>`;
    } else if (showAuctionStatus) {
      // Show auction indicator - include contract type if known (from JSON data with no real owner info)
      const auctionLabel = auctionContractName ? `On ${auctionContractName}` : "On Auction";
      ownerHtml = `<span class="small auction-warning">${auctionLabel}</span>`;
    } else {
      ownerHtml = `<span class="small muted">Unknown</span>`;
    }

    // Auction status badge with price (links to kitty page where auction is displayed)
    let statusHtml = "";
    if (isOnAuction) {
      const statusLabel = auctionType === "sire" ? "For Siring" : "For Sale";
      const currentPrice = formatEth(auction.current_price);
      const priceHtml = currentPrice ? ` · ${currentPrice}` : "";
      statusHtml = `<div class="k">Status</div><div class="v"><a href="${kittyUrl(id)}" target="_blank" rel="noopener" class="tag auction-tag">${statusLabel}${priceHtml}</a></div>`;
    }

    // Background color display
    const colors = getKittyColors(k);
    const colorName = k.color || null;
    const bgColorHtml = colors.isUnknown
      ? `<span class="small auction-warning">Unknown</span>`
      : `<span class="color-swatch" style="background:${colors.background}"></span>${colorName ? safeText(colorName) : colors.background}`;

    // Birthday with full timestamp tooltip
    const birthDate = k.created_at || k.birthday || "";
    const bornHtml = birthDate
      ? `<span title="${safeText(formatDateTimeFull(birthDate))}">${formatDatePretty(birthDate)}</span>`
      : "";

    const traits = k.traits || {};
    const traitKeys = Object.keys(traits).slice(0, 12);
    const gems = getMewtationGems(k);
    const gemsFull = gemsHtml(gems, false);

    // Children count: total from API and how many are in the current graph
    const apiChildren = raw.children;
    const totalChildren = Array.isArray(apiChildren) ? apiChildren.length : null;
    let childrenInGraph = 0;
    for (const [childId, childK] of kittyById.entries()) {
      if (childK.matron_id === id || childK.sire_id === id) {
        childrenInGraph++;
      }
    }

    // Build children display: "X (Y shown)" or "X" if all shown, or "Unknown"
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

    // Create a set of trait types that earned mewtations for highlighting
    const mewtationTraits = new Set(gems.map(g => g.type));

    if (!selectedBox) return;

    // Build traits HTML with highlighting for mewtation-earning traits and links to cattribute pages
    const traitsHtml = traitKeys.map(t => {
      const traitValue = traits[t];
      const traitLink = `<a href="${cattributeUrl(traitValue)}" target="_blank" rel="noopener" class="trait-link">${safeText(traitValue)}</a>`;
      const gem = gems.find(g => g.type === t);
      if (gem) {
        return `<span class="tag tag-mewtation tag-trait" data-trait="${safeText(traitValue)}" title="${gemDisplayName(gem.gem)} #${gem.position}">
          <img src="${GEM_IMAGES[gem.gem]}" alt="" class="gem-icon gem-icon-sm" />
          ${t}: ${traitLink}
        </span>`;
      }
      return `<span class="tag tag-trait" data-trait="${safeText(traitValue)}">${t}: ${traitLink}</span>`;
    }).join("");

    const kittyImg = k.image_url || "";

    selectedBox.innerHTML = `
      <div class="selected-header">
        <div class="selected-thumb" style="background:${colors.background};--shadow-color:${colors.shadow};">
          ${kittyImg ? `<img src="${kittyImg}" alt="" />` : ""}
        </div>
        <div>
          <div class="kitty-name"><a href="${kittyUrl(id)}" target="_blank" rel="noopener">${safeText(k.name || `Kitty ${k.id}`)}</a></div>
          <div class="kitty-meta">#${k.id} · Gen ${safeText(k.generation)}</div>
        </div>
      </div>
      <div class="kv">
        <div class="k">Color</div><div class="v">${bgColorHtml}</div>
        <div class="k">Born</div><div class="v">${bornHtml}</div>
        <div class="k">Owner</div><div class="v">${ownerHtml}</div>
        ${statusHtml}
        <div class="k">Children</div><div class="v">${childrenHtml}</div>
        ${gems.length ? `<div class="k">Mewtations</div><div class="v gems-list">${gemsFull}</div>` : ""}
        <div class="k">Traits</div>
        <div class="v">${traitKeys.length ? traitsHtml : "<span class='small'>None</span>"}</div>
      </div>
    `;

    // Helper to set up owner highlight handlers on a container
    function setupOwnerHighlightHandlers(container) {
      const ownerLink = container.querySelector(".owner-link");
      const highlightBtn = container.querySelector(".owner-highlight-btn");

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

      if (highlightBtn) {
        highlightBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const addr = highlightBtn.dataset.owner || null;
          const nick = highlightBtn.dataset.ownerNick || null;

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

          // Re-render to update button state
          showSelected(id);
        });
      }
    }

    // Set up handlers for sidebar
    setupOwnerHighlightHandlers(selectedBox);

    // Set up trait highlight handlers
    function setupTraitHighlightHandlers(container) {
      const traitTags = container.querySelectorAll(".tag-trait");
      traitTags.forEach(tag => {
        tag.addEventListener("mouseenter", () => {
          const traitValue = tag.dataset.trait;
          if (traitValue) highlightByTrait(traitValue);
        });
        tag.addEventListener("mouseleave", () => {
          // Restore to previous state
          if (selectedNodeId) {
            highlightFamilyEdges(selectedNodeId);
            // Restore node styles
            const nodeUpdates = [];
            for (const nid of nodes.getIds()) {
              const base = nodeBaseStyle.get(Number(nid));
              if (!base) continue;
              if (Number(nid) === selectedNodeId) {
                nodeUpdates.push({
                  id: Number(nid),
                  size: base.size + 6,
                  color: { background: base.bg, border: "#ffffff" },
                  borderWidth: 3
                });
              } else {
                nodeUpdates.push({
                  id: Number(nid),
                  size: base.size,
                  color: { background: base.bg, border: base.border },
                  borderWidth: base.borderWidth
                });
              }
            }
            if (nodeUpdates.length) nodes.update(nodeUpdates);
          } else {
            restoreAllNodes();
          }
        });
      });
    }

    setupTraitHighlightHandlers(selectedBox);

    // Also update floating panel (for embed mode)
    const floatingBox = $("floatingSelectedBox");
    if (floatingBox) {
      floatingBox.innerHTML = selectedBox.innerHTML;
      // Set up handlers for floating panel
      setupOwnerHighlightHandlers(floatingBox);
      setupTraitHighlightHandlers(floatingBox);
      // Show floating panel if hidden
      const floatingPanel = $("floatingPanel");
      if (floatingPanel) floatingPanel.classList.remove("panel-hidden");
    }

    logv("showSelected:", { id, owner_addr: displayOwnerAddr, owner_nick: displayOwnerNick, isOnAuction, auctionType, gems });
  }

  function buildNetworkOptions(layoutType) {
    const nodeCount = nodes.length;
    const useImprovedLayout = nodeCount <= 100;

    // Base options shared by all layouts
    const options = {
      autoResize: false, // Disable to prevent jitter on large graphs (we handle resize manually)
      layout: {
        improvedLayout: useImprovedLayout
      },
      nodes: {
        chosen: false
      },
      edges: {
        smooth: { enabled: true, type: "continuous", roundness: 0.5 },
        arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        chosen: false
      },
      interaction: { hover: true, hoverConnectedEdges: false, dragNodes: true, dragView: true, zoomView: true, zoomSpeed: 0.3 }
    };

    // Apply layout-specific options
    if (PHYSICS_SOLVERS[layoutType]) {
      // Physics-based layout
      options.layout.hierarchical = { enabled: false };
      options.physics = {
        enabled: true,
        stabilization: { enabled: true, iterations: 300, updateInterval: 25, fit: true },
        ...PHYSICS_SOLVERS[layoutType]
      };
    } else if (layoutType === "circle") {
      // Circle layout - positions set manually after network creation
      options.layout.hierarchical = { enabled: false };
      options.physics = { enabled: false };
    } else {
      // Sugiyama hierarchical layout
      const directionMap = {
        hierarchicalUD: "UD",
        hierarchicalDU: "DU",
        hierarchicalLR: "LR"
      };
      const direction = directionMap[layoutType] || "UD";

      options.layout.hierarchical = {
        enabled: true,
        direction: direction,
        sortMethod: "directed",
        levelSeparation: 150,
        nodeSpacing: 120,
        treeSpacing: 200,
        blockShifting: true,
        edgeMinimization: true,
        parentCentralization: true
      };
      options.physics = { enabled: false };
    }

    return options;
  }

  // Arrange nodes in a circle
  function arrangeNodesInCircle() {
    const nodeIds = nodes.getIds();
    const count = nodeIds.length;
    if (count === 0) return;

    // Calculate radius based on node count (larger graphs need bigger circles)
    const radius = Math.max(200, count * 12);
    const angleStep = (2 * Math.PI) / count;

    const updates = [];
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep - Math.PI / 2; // Start from top
      updates.push({
        id: nodeIds[i],
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      });
    }
    nodes.update(updates);
    log("arrangeNodesInCircle:", { count, radius });
  }

  function renderNetworkWithLayout(layoutType) {
    const container = $("network");
    if (!container) throw new Error("Missing #network element");

    currentLayout = layoutType;
    const options = buildNetworkOptions(layoutType);
    const isPhysics = !!PHYSICS_SOLVERS[layoutType];

    log("renderNetworkWithLayout:", { layoutType, isPhysics, nodeCount: nodes.length });

    if (network) {
      try { network.destroy(); } catch {}
      network = null;
    }

    network = new vis.Network(container, { nodes, edges }, options);
    physicsOn = isPhysics;

    // Apply circle layout positioning after network creation
    if (layoutType === "circle") {
      arrangeNodesInCircle();
    }

    const physBtn = $("togglePhysicsBtn");
    if (physBtn) physBtn.textContent = `Physics: ${physicsOn ? "on" : "off"}`;

    // Draw mewtation gems at the edge of nodes
    network.on("afterDrawing", (ctx) => {
      const positions = network.getPositions();

      for (const [id, pos] of Object.entries(positions)) {
        const base = nodeBaseStyle.get(Number(id));
        if (!base || !base.gems || base.gems.length === 0) continue;

        const node = nodes.get(Number(id));
        const nodeSize = node && node.size ? node.size : (base.size || 38);
        const gemSize = nodeSize > 44 ? 20 : 16;

        const gemPriority = { diamond: 4, gold: 3, silver: 2, bronze: 1 };
        const sortedGems = [...base.gems].sort((a, b) => (gemPriority[b.gem] || 0) - (gemPriority[a.gem] || 0));
        const gemsToShow = sortedGems.slice(0, 3);

        for (let i = 0; i < gemsToShow.length; i++) {
          const gem = gemsToShow[i];
          const img = gemImageCache.get(gem.gem);
          if (!img) continue;

          const angle = Math.PI * 0.25 + (i * Math.PI * 0.2);
          const edgeX = pos.x + Math.cos(angle) * nodeSize;
          const edgeY = pos.y + Math.sin(angle) * nodeSize;

          ctx.save();
          ctx.drawImage(img, edgeX - gemSize / 2, edgeY - gemSize / 2, gemSize, gemSize);
          ctx.restore();
        }
      }
    });

    network.on("click", (params) => {
      hideContextMenu();
      const id = params.nodes && params.nodes[0];
      const prevSelected = selectedNodeId;

      if (id) {
        const clickedId = Number(id);

        if (shortestPathMode && selectedNodeId && clickedId !== selectedNodeId) {
          lockedPathToId = clickedId;
          highlightShortestPath(selectedNodeId, lockedPathToId);
          showSelected(selectedNodeId);
          return;
        }

        selectedNodeId = clickedId;
        lockedPathToId = null;
        if (prevSelected && prevSelected !== selectedNodeId) {
          clearSelectionStyle(prevSelected);
        }
        applySelectionStyle(selectedNodeId);
        highlightFamilyEdges(selectedNodeId);
        showSelected(selectedNodeId);
      } else {
        selectedNodeId = null;
        lockedPathToId = null;
        if (prevSelected) {
          clearSelectionStyle(prevSelected);
        }

        const filterActive = generationHighlightActive || mewtationHighlightActive;

        if (filterActive) {
          if (prevSelected) {
            const filteredStyle = getFilteredNodeStyle(prevSelected);
            if (filteredStyle) {
              nodes.update(filteredStyle);
            }
          }
          if (filterEdgeHighlight) {
            reapplyFilterEdges();
          } else {
            reapplyOwnerEdges();
          }
        } else if (ownerHighlightLocked) {
          highlightOwnerKitties(lockedOwnerAddr, lockedOwnerNick);
        } else {
          restoreAllNodes();
        }
        if (selectedBox) selectedBox.textContent = "None";
      }
    });

    network.on("doubleClick", async (params) => {
      const id = params.nodes && params.nodes[0];
      if (!id) return;
      await expandFamily(Number(id));
    });

    network.on("oncontext", (params) => {
      params.event.preventDefault();
      const nodeId = network.getNodeAt(params.pointer.DOM);
      if (nodeId) {
        hideTooltip();
        showContextMenu(Number(nodeId), params);
      } else {
        hideContextMenu();
      }
    });

    network.on("hoverNode", (params) => {
      const id = Number(params.node);
      const base = nodeBaseStyle.get(id);
      if (!base) return;

      // Save current view to restore after updates (prevents zoom jitter)
      const currentScale = network.getScale();
      const currentPosition = network.getViewPosition();

      // Calculate path info for tooltip if in shortest path mode
      let pathInfo = null;
      if (shortestPathMode && selectedNodeId) {
        if (id === selectedNodeId) {
          pathInfo = { hops: 0 };
        } else {
          const path = findShortestPath(selectedNodeId, id);
          pathInfo = { hops: path.length > 0 ? path.length - 1 : -1 };
        }
      }

      showTooltip(id, params.event, pathInfo);

      if (shortestPathMode && selectedNodeId && selectedNodeId !== id) {
        highlightShortestPath(selectedNodeId, id);
        nodes.update({ id, size: 50, color: { background: brightenHex(base.bg, 0.28), border: "#ffffff" }, borderWidth: 3 });
        network.moveTo({ scale: currentScale, position: currentPosition, animation: false });
        return;
      }

      nodes.update({ id, size: 50, color: { background: brightenHex(base.bg, 0.28), border: "#ffffff" }, borderWidth: 3 });
      highlightFamilyEdges(id);

      // Restore view after all updates
      network.moveTo({ scale: currentScale, position: currentPosition, animation: false });
    });

    network.on("blurNode", (params) => {
      const id = Number(params.node);
      const base = nodeBaseStyle.get(id);
      if (!base) return;

      // Save current view to restore after updates (prevents zoom jitter)
      const currentScale = network.getScale();
      const currentPosition = network.getViewPosition();

      hideTooltip();

      if (shortestPathMode && selectedNodeId) {
        const filterActive = generationHighlightActive || mewtationHighlightActive;
        const nodeUpdates = [];
        for (const nodeId of nodes.getIds()) {
          const nid = Number(nodeId);
          const nodeBase = nodeBaseStyle.get(nid);
          if (!nodeBase) continue;

          if (nid === selectedNodeId) {
            nodeUpdates.push({
              id: nid,
              size: nodeBase.size + 6,
              color: { background: nodeBase.bg, border: "#ffffff" },
              borderWidth: 3
            });
          } else if (filterActive) {
            const filteredStyle = getFilteredNodeStyle(nid);
            if (filteredStyle) nodeUpdates.push(filteredStyle);
          } else {
            nodeUpdates.push({
              id: nid,
              size: nodeBase.size,
              color: { background: nodeBase.bg, border: nodeBase.border },
              borderWidth: nodeBase.borderWidth
            });
          }
        }
        if (nodeUpdates.length) nodes.update(nodeUpdates);

        if (lockedPathToId) {
          highlightShortestPath(selectedNodeId, lockedPathToId);
        } else {
          highlightFamilyEdges(selectedNodeId);
        }
        network.moveTo({ scale: currentScale, position: currentPosition, animation: false });
        return;
      }

      if (id === selectedNodeId) {
        applySelectionStyle(id);
        highlightFamilyEdges(id);
      } else {
        const filterActive = generationHighlightActive || mewtationHighlightActive;

        if (filterActive) {
          const filteredStyle = getFilteredNodeStyle(id);
          if (filteredStyle) {
            nodes.update(filteredStyle);
          }
          if (selectedNodeId) {
            highlightFamilyEdges(selectedNodeId);
          } else if (filterEdgeHighlight) {
            reapplyFilterEdges();
          } else {
            reapplyOwnerEdges();
          }
        } else {
          nodes.update({ id, size: base.size, color: { background: base.bg, border: base.border }, borderWidth: base.borderWidth });

          if (selectedNodeId) {
            highlightFamilyEdges(selectedNodeId);
          } else if (ownerHighlightLocked) {
            highlightOwnerKitties(lockedOwnerAddr, lockedOwnerNick);
          } else {
            restoreEdgeColors();
          }
        }
      }

      // Restore view after all updates
      network.moveTo({ scale: currentScale, position: currentPosition, animation: false });
    });

    setStats();

    // Fit after layout stabilizes
    // LR layouts need extra time and a second fit attempt
    const isLR = layoutType === "hierarchicalLR";
    const delay = isPhysics ? 400 : (isLR ? 300 : 150);

    setTimeout(() => {
      fitMainCluster();
      setStatus("Layout: " + layoutType, false);

      // LR layouts often need a second fit
      if (isLR) {
        setTimeout(() => fitMainCluster(), 400);
      }
    }, delay);
  }

  function renderNetwork() {
    renderNetworkWithLayout(currentLayout);
  }

  function loadJsonObject(obj) {
    nodes.clear();
    edges.clear();
    kittyById = new Map();
    expandedIds = new Set();
    resolvedImgUrl.clear();
    nodeBaseStyle.clear();
    cachedApiResponses.clear();
    selectedNodeId = null;

    // Reset filter states
    generationHighlightActive = false;
    generationRangeMin = null;
    generationRangeMax = null;
    mewtationHighlightActive = false;
    highlightedGemTypes.clear();
    filterEdgeHighlight = false;
    shortestPathMode = false;
    lockedPathToId = null;

    // Reset filter UI
    const genMinInput = $("generationMin");
    const genMaxInput = $("generationMax");
    const edgeHighlightToggle = $("filterEdgeHighlight");
    const shortestPathToggle = $("shortestPathMode");
    if (genMinInput) genMinInput.value = "";
    if (genMaxInput) genMaxInput.value = "";
    if (edgeHighlightToggle) edgeHighlightToggle.checked = false;
    if (shortestPathToggle) shortestPathToggle.checked = false;

    // Clear mewtation buttons
    ["mewtationFilterAll", "mewtationFilterDiamond", "mewtationFilterGold", "mewtationFilterSilver", "mewtationFilterBronze"].forEach(id => {
      const btn = $(id);
      if (btn) btn.classList.remove("active");
    });

    const roots = Array.isArray(obj.root_ids) ? obj.root_ids.map(Number) : [];
    myKittyIds = new Set(roots);

    const kitties = Array.isArray(obj.kitties) ? obj.kitties : [];
    log("loadJsonObject:", { roots: roots.length, kitties: kitties.length });

    for (const k of kitties) upsertKitty(k);
    rebuildAllEdges(); // Create edges after all nodes exist

    renderNetwork();
    updateFilterControls();
    setStatus(`Loaded ${kitties.length} kitties`, false);
  }

  function updateFilterControls() {
    // Update generation range placeholders
    const gens = getAvailableGenerations();
    const minGen = gens.length > 0 ? Math.min(...gens) : 0;
    const maxGen = gens.length > 0 ? Math.max(...gens) : 0;

    const genMinInput = $("generationMin");
    const genMaxInput = $("generationMax");

    if (genMinInput) {
      genMinInput.placeholder = `Min (${minGen})`;
      genMinInput.min = minGen;
    }
    if (genMaxInput) {
      genMaxInput.placeholder = `Max (${maxGen})`;
      genMaxInput.max = maxGen;
    }

    log("updateFilterControls:", { generations: gens, minGen, maxGen });

    // Update mewtation filter buttons
    updateMewtationFilterButtons();
  }

  async function loadJsonFromUrl(url) {
    log("loadJsonFromUrl:", url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const data = await res.json();
    loadJsonObject(data);
  }

  // Lazy pre-fetch: fetch full details for embedded kitties in the background
  // Updates nodes as data arrives without blocking initial render
  async function lazyPrefetchEmbedded(embeddedIds) {
    if (!embeddedIds || embeddedIds.length === 0) return;

    log("lazyPrefetchEmbedded: starting for", embeddedIds.length, "kitties");
    const delay = 150; // ms between requests to avoid rate limiting
    let updated = 0;

    for (const id of embeddedIds) {
      try {
        // Skip if we already have full data (has raw.children or raw.matron)
        const existing = kittyById.get(id);
        if (existing && existing.raw && (existing.raw.children || existing.raw.matron || existing.raw.sire)) {
          logv("lazyPrefetchEmbedded: skipping", id, "(already has full data)");
          continue;
        }

        logv("lazyPrefetchEmbedded: fetching", id);
        const kitty = await fetchJson(apiUrl(`/kitties/${id}`));
        const kObj = unwrapKitty(kitty);
        const normalized = normalizeFromApi(kObj);

        // Merge with existing data (preserve parent refs that may have been set)
        const merged = existing ? { ...existing, ...normalized } : normalized;
        if (existing) {
          // Preserve parent references if the new data doesn't have them
          if (!merged.matron_id && existing.matron_id) merged.matron_id = existing.matron_id;
          if (!merged.sire_id && existing.sire_id) merged.sire_id = existing.sire_id;
        }

        // Update the kitty data
        kittyById.set(id, merged);

        // Refresh the node to pick up new data (owner, colors, etc.)
        addOrUpdateKittyNode(merged, false);

        // Cache the full API response for potential later expansion
        cachedApiResponses.set(id, kObj);

        updated++;
        logv("lazyPrefetchEmbedded: updated", id);

        // Small delay between requests
        await new Promise(r => setTimeout(r, delay));
      } catch (e) {
        log("lazyPrefetchEmbedded: failed for", id, e.message);
      }
    }

    log("lazyPrefetchEmbedded: completed, updated", updated, "of", embeddedIds.length);

    // Refresh the selected node panel if one is selected
    if (selectedNodeId && embeddedIds.includes(selectedNodeId)) {
      showSelected(selectedNodeId);
    }

    // Brief status update
    if (updated > 0) {
      setStatus(`Pre-fetched ${updated} kitties`, false);
    }
  }

  async function loadKittiesById(ids, noExpand = false) {
    if (!ids || ids.length === 0) return;
    log("loadKittiesById:", ids, "noExpand:", noExpand);
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

        // Collect embedded parents/children (skip if noExpand)
        if (!noExpand) {
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
        updateFilterControls();

        network.setOptions({
          physics: {
            enabled: true,
            stabilization: { enabled: true, iterations: 200, updateInterval: 25, fit: false }
          }
        });
        network.stabilize();
        physicsOn = true;
        const physBtn = $("togglePhysicsBtn");
        if (physBtn) physBtn.textContent = "Physics: on";

        setTimeout(() => fitMainCluster(), 200);
        setStatus(`Added ${ids.length} kitty(s) to graph`, false);
      } else {
        log("loadKittiesById: loading as new graph (no connection)");
        loadJsonObject({ root_ids: Array.from(requestedIds), kitties: kittiesToAdd });
        setStatus(`Loaded ${ids.length} kitty(s)`, false);
      }

      // Lazy pre-fetch embedded kitties in background if setting enabled
      if (!noExpand && wantPrefetchChildren() && embeddedData.size > 0) {
        const embeddedIds = Array.from(embeddedData.keys());
        log("loadKittiesById: starting lazy pre-fetch for", embeddedIds.length, "embedded kitties");
        // Start in background (don't await - let it run asynchronously)
        setTimeout(() => lazyPrefetchEmbedded(embeddedIds), 500);
      }
    } catch (e) {
      console.error(e);
      setStatus(`Failed to load kitties: ${e.message}`, true);
    }
  }

  function generatePermalinkUrl() {
    const svgBaseEl = $("svgBaseUrl");
    const svgBase = svgBaseEl && svgBaseEl.value ? svgBaseEl.value.trim() : "";

    let url;

    // If loaded from dataUrl and no expansion happened, use dataUrl
    if (loadedFromDataUrl && expandedIds.size === 0) {
      url = `${window.location.origin}?dataUrl=${encodeURIComponent(loadedFromDataUrl)}`;
      if (svgBase) url += `&svgBaseUrl=${encodeURIComponent(svgBase)}`;
      log("Permalink: using dataUrl (no expansion)", loadedFromDataUrl);
    } else {
      // Otherwise pass all kitty IDs with noExpand
      const allIds = Array.from(kittyById.keys()).sort((a, b) => a - b);

      if (allIds.length === 0) {
        return window.location.origin;
      }

      url = `${window.location.origin}?kitties=${allIds.join(",")}&noExpand=true`;
      if (svgBase) url += `&svgBaseUrl=${encodeURIComponent(svgBase)}`;
      log("Permalink:", allIds.length, "IDs with noExpand");
    }

    // Add owner highlight if pinned
    if (ownerHighlightLocked && (lockedOwnerAddr || lockedOwnerNick)) {
      const ownerParam = lockedOwnerAddr || lockedOwnerNick;
      url += `&owner=${encodeURIComponent(ownerParam)}`;
    }

    // Add generation filter if active
    if (generationHighlightActive) {
      if (generationRangeMin !== null) {
        url += `&genMin=${generationRangeMin}`;
      }
      if (generationRangeMax !== null) {
        url += `&genMax=${generationRangeMax}`;
      }
    }

    // Add mewtation filter if active
    if (mewtationHighlightActive) {
      if (highlightedGemTypes.size === 0) {
        url += `&mewtations=all`;
      } else {
        url += `&mewtations=${Array.from(highlightedGemTypes).join(",")}`;
      }
    }

    // Add edge highlight toggle if enabled
    if (filterEdgeHighlight) {
      url += `&filterEdges=true`;
    }

    // Add shortest path if active and locked
    if (shortestPathMode && selectedNodeId && lockedPathToId) {
      url += `&pathFrom=${selectedNodeId}&pathTo=${lockedPathToId}`;
    } else if (selectedNodeId) {
      // Add selected kitty (only if not using path mode)
      url += `&selected=${selectedNodeId}`;
    }

    // Add layout if not default
    if (currentLayout && currentLayout !== "clustered") {
      url += `&layout=${encodeURIComponent(currentLayout)}`;
    }

    return url;
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
        loadedFromDataUrl = null; // Local files can't be shared via URL
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
        loadedFromDataUrl = url;
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

    const layoutSelect = $("layoutSelect");
    if (layoutSelect) {
      layoutSelect.addEventListener("change", () => {
        setLayout(layoutSelect.value);
      });
    }

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
        loadedFromDataUrl = null;
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

    // Generation range filter
    const genMinInput = $("generationMin");
    const genMaxInput = $("generationMax");

    const applyGenerationFilter = () => {
      const minVal = genMinInput ? genMinInput.value : "";
      const maxVal = genMaxInput ? genMaxInput.value : "";
      highlightByGenerationRange(minVal, maxVal);
    };

    if (genMinInput) {
      genMinInput.addEventListener("input", applyGenerationFilter);
    }
    if (genMaxInput) {
      genMaxInput.addEventListener("input", applyGenerationFilter);
    }

    // Edge highlight toggle
    const edgeHighlightToggle = $("filterEdgeHighlight");
    if (edgeHighlightToggle) {
      edgeHighlightToggle.addEventListener("change", () => {
        filterEdgeHighlight = edgeHighlightToggle.checked;
        // Re-apply active filter if any
        if (generationHighlightActive) {
          applyGenerationFilter();
        } else if (mewtationHighlightActive) {
          const activeGems = ["diamond", "gold", "silver", "bronze"].filter(
            g => {
              const btn = $(`mewtationFilter${g.charAt(0).toUpperCase() + g.slice(1)}`);
              return btn && btn.classList.contains("active");
            }
          );
          const allBtn = $("mewtationFilterAll");
          if (allBtn && allBtn.classList.contains("active")) {
            highlightMewtations(true);
          } else if (activeGems.length > 0) {
            highlightMewtations(activeGems);
          }
        }
      });
    }

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
          // Toggle off
          clearMewtationBtns();
          highlightMewtations(null);
        } else {
          clearMewtationBtns();
          mewtationBtns.all.classList.add("active");
          highlightMewtations(true); // All gems
        }
      });
    }

    ["diamond", "gold", "silver", "bronze"].forEach(gemType => {
      const btn = mewtationBtns[gemType];
      if (btn) {
        btn.addEventListener("click", () => {
          if (btn.classList.contains("active")) {
            // Toggle off
            btn.classList.remove("active");
            // Check if any other gem buttons are active
            const activeGems = ["diamond", "gold", "silver", "bronze"].filter(
              g => mewtationBtns[g] && mewtationBtns[g].classList.contains("active")
            );
            if (activeGems.length === 0) {
              highlightMewtations(null);
            } else {
              highlightMewtations(activeGems);
            }
          } else {
            // Toggle on - allow multiple selection
            mewtationBtns.all && mewtationBtns.all.classList.remove("active");
            btn.classList.add("active");
            const activeGems = ["diamond", "gold", "silver", "bronze"].filter(
              g => mewtationBtns[g] && mewtationBtns[g].classList.contains("active")
            );
            highlightMewtations(activeGems);
          }
        });
      }
    });

    // Shortest path mode toggle
    const shortestPathToggle = $("shortestPathMode");
    if (shortestPathToggle) {
      shortestPathToggle.addEventListener("change", () => {
        shortestPathMode = shortestPathToggle.checked;
        if (shortestPathMode) {
          setStatus("Shortest path mode: hover over a kitty to see path from selected", false);
        } else {
          lockedPathToId = null;
          // Restore normal edge highlighting
          if (selectedNodeId) {
            highlightFamilyEdges(selectedNodeId);
          } else {
            restoreEdgeColors();
          }
          setStatus("Shortest path mode disabled", false);
        }
      });
    }

    // Clear filters button
    const clearFiltersBtn = $("clearFiltersBtn");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        // Reset generation range filter
        if (genMinInput) genMinInput.value = "";
        if (genMaxInput) genMaxInput.value = "";
        generationHighlightActive = false;
        generationRangeMin = null;
        generationRangeMax = null;

        // Reset mewtation filters
        clearMewtationBtns();
        mewtationHighlightActive = false;
        highlightedGemTypes.clear();

        // Reset edge highlight toggle
        if (edgeHighlightToggle) edgeHighlightToggle.checked = false;
        filterEdgeHighlight = false;

        // Reset shortest path mode
        if (shortestPathToggle) shortestPathToggle.checked = false;
        shortestPathMode = false;
        lockedPathToId = null;

        // Note: Owner highlight is preserved - use the owner highlight button to clear it

        restoreAllNodes();
        setStatus("Filters cleared", false);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    assertVisLoaded();
    applyDefaultsToUI();
    wireControls();
    preloadGemImages(); // Load mewtation gem images

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Disable shortest path mode
        if (shortestPathMode) {
          shortestPathMode = false;
          lockedPathToId = null;
          const spToggle = $("shortestPathMode");
          if (spToggle) spToggle.checked = false;
          setStatus("Shortest path mode disabled", false);
          // Restore view
          if (selectedNodeId) {
            highlightFamilyEdges(selectedNodeId);
          } else {
            restoreAllNodes();
          }
        }
        // Remove focus to prevent blue outline on buttons
        if (document.activeElement) document.activeElement.blur();
      }
    });

    // Filters panel collapse toggle
    const filtersToggle = $("filtersToggle");
    const filtersBody = $("filtersBody");
    if (filtersToggle && filtersBody) {
      filtersToggle.addEventListener("click", () => {
        filtersToggle.classList.toggle("collapsed");
        filtersBody.classList.toggle("collapsed");
      });
    }

    // Settings panel collapse toggle
    const settingsToggle = $("settingsToggle");
    const settingsBody = $("settingsBody");
    if (settingsToggle && settingsBody) {
      settingsToggle.addEventListener("click", () => {
        settingsToggle.classList.toggle("collapsed");
        settingsBody.classList.toggle("collapsed");
      });
    }

    // Examples panel collapse toggle
    const examplesToggle = $("examplesToggle");
    const examplesBody = $("examplesBody");
    if (examplesToggle && examplesBody) {
      examplesToggle.addEventListener("click", () => {
        examplesToggle.classList.toggle("collapsed");
        examplesBody.classList.toggle("collapsed");
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

    // Viewer link - opens standalone viewer to reconstruct this graph
    if (floatingViewerLink) {
      floatingViewerLink.addEventListener("click", () => {
        const url = generatePermalinkUrl();
        window.open(url, "_blank");
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

    // Check if we have data to load (kitty IDs, dataUrl param, or default dataUrl)
    const jsonUrlEl = $("jsonUrl");
    const defaultUrl = (jsonUrlEl && jsonUrlEl.value ? jsonUrlEl.value : "").trim();
    const hasDataToLoad = kittyIds.length > 0 || dataUrlParam || defaultUrl;

    // Collapse examples panel if loading data (unless examples=open param is set)
    const keepExamplesOpen = params.get("examples") === "open";
    if (examplesToggle && examplesBody) {
      if (hasDataToLoad && !keepExamplesOpen) {
        examplesToggle.classList.add("collapsed");
        examplesBody.classList.add("collapsed");
      } else {
        examplesToggle.classList.remove("collapsed");
        examplesBody.classList.remove("collapsed");
      }
    }

    // Check for ?owner= to pin owner highlight (detects address vs nickname)
    const ownerParam = params.get("owner");

    // Check for layout param
    const layoutParam = params.get("layout");

    // Apply layout param before data loading
    const validLayouts = ["clustered", "physics", "barnesHut", "repulsion", "circle", "hierarchicalUD", "hierarchicalDU", "hierarchicalLR"];
    if (layoutParam && validLayouts.includes(layoutParam)) {
      currentLayout = layoutParam;
      const layoutSelect = $("layoutSelect");
      if (layoutSelect) layoutSelect.value = layoutParam;
      log("Layout from query param:", layoutParam);
    }

    // Check for filter query params
    const genMinParam = params.get("genMin");
    const genMaxParam = params.get("genMax");
    const mewtationsParam = params.get("mewtations");
    const filterEdgesParam = params.get("filterEdges") === "true" || params.get("filterEdges") === "1";

    // Check for pathFrom/pathTo params (auto-highlight shortest path)
    const pathFromParam = params.get("pathFrom");
    const pathToParam = params.get("pathTo");

    // Check for selected kitty param
    const selectedParam = params.get("selected");

    // Helper to apply filters after graph loads
    const applyFiltersFromParams = () => {
      // Wait a bit for the graph to stabilize
      setTimeout(() => {
        let filtersApplied = false;

        // Apply generation filter
        if (genMinParam !== null || genMaxParam !== null) {
          const genMinInput = $("generationMin");
          const genMaxInput = $("generationMax");
          if (genMinParam && genMinInput) genMinInput.value = genMinParam;
          if (genMaxParam && genMaxInput) genMaxInput.value = genMaxParam;

          generationHighlightActive = true;
          generationRangeMin = genMinParam ? Number(genMinParam) : null;
          generationRangeMax = genMaxParam ? Number(genMaxParam) : null;
          filtersApplied = true;
          log("Generation filter from query param:", { min: generationRangeMin, max: generationRangeMax });
        }

        // Apply mewtation filter
        if (mewtationsParam) {
          const mewtationBtns = {
            all: $("mewtationFilterAll"),
            diamond: $("mewtationFilterDiamond"),
            gold: $("mewtationFilterGold"),
            silver: $("mewtationFilterSilver"),
            bronze: $("mewtationFilterBronze")
          };

          mewtationHighlightActive = true;

          if (mewtationsParam.toLowerCase() === "all") {
            highlightedGemTypes = new Set();
            if (mewtationBtns.all) mewtationBtns.all.classList.add("active");
          } else {
            const gemTypes = mewtationsParam.toLowerCase().split(",").map(s => s.trim()).filter(s => s);
            highlightedGemTypes = new Set(gemTypes);
            // Update UI buttons
            for (const gemType of gemTypes) {
              const btn = mewtationBtns[gemType];
              if (btn) btn.classList.add("active");
            }
          }
          filtersApplied = true;
          log("Mewtation filter from query param:", { mewtations: mewtationsParam, gemTypes: Array.from(highlightedGemTypes) });
        }

        // Apply edge highlight toggle
        if (filterEdgesParam) {
          const edgeHighlightToggle = $("filterEdgeHighlight");
          if (edgeHighlightToggle) edgeHighlightToggle.checked = true;
          filterEdgeHighlight = true;
          log("Filter edges from query param: true");
        }

        // Apply combined filters if any were set
        if (filtersApplied) {
          applyFilterHighlighting();
        }
      }, 600); // Slightly after owner highlight (500ms)
    };

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

    // Combined callback for post-load actions
    const applyPostLoadParams = () => {
      applyOwnerHighlight();
      applyFiltersFromParams();

      // Apply pathFrom/pathTo highlighting
      if (pathFromParam && pathToParam) {
        setTimeout(() => {
          const fromId = Number(pathFromParam);
          const toId = Number(pathToParam);
          if (kittyById.has(fromId) && kittyById.has(toId)) {
            // Enable shortest path mode and update UI toggle
            shortestPathMode = true;
            lockedPathToId = toId; // Persist path target
            const toggle = $("shortestPathMode");
            if (toggle) toggle.checked = true;
            // Select the "from" node and highlight path to "to" node
            selectedNodeId = fromId;
            applySelectionStyle(fromId);
            showSelected(fromId);
            highlightShortestPath(fromId, toId);
            log("Path highlighting from query params:", { from: fromId, to: toId });
          } else {
            console.warn("pathFrom/pathTo: kitty not found in graph", { fromId, toId });
          }
        }, 700); // After filters (600ms)
      } else if (selectedParam) {
        // Apply selected kitty (only if not using path mode)
        setTimeout(() => {
          const selId = Number(selectedParam);
          if (kittyById.has(selId)) {
            selectedNodeId = selId;
            applySelectionStyle(selId);
            highlightFamilyEdges(selId);
            showSelected(selId);
            // Center on the selected kitty
            if (network) {
              const pos = network.getPosition(selId);
              if (pos) {
                network.moveTo({
                  position: { x: pos.x, y: pos.y },
                  animation: { duration: 400, easingFunction: "easeInOutQuad" }
                });
              }
            }
            log("Selected kitty from query param:", selId);
          } else {
            console.warn("selected: kitty not found in graph", selId);
          }
        }, 700);
      }
    };

    // Check for noExpand param (skip embedded parent/child extraction)
    const noExpand = params.get("noExpand") === "true" || params.get("noExpand") === "1";

    if (kittyIds.length > 0) {
      // Query param takes precedence - load from API
      log("Loading from query param:", kittyIds, "noExpand:", noExpand);
      loadedFromDataUrl = null;
      loadKittiesById(kittyIds, noExpand).then(() => {
        applyPostLoadParams();
      }).catch((e) => {
        console.error(e);
        setStatus("Failed to load kitties from query param", true);
      });
    } else {
      // Fall back to default JSON URL (from query param or config)
      const urlEl = $("jsonUrl");
      const url = (urlEl && urlEl.value ? urlEl.value : "").trim();
      if (url) {
        loadedFromDataUrl = url;
        loadJsonFromUrl(url).then(() => {
          applyPostLoadParams();
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