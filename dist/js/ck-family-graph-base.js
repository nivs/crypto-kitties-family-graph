/* Shared utilities for both 2D and 3D viewers */

// ===================== DOM UTILITIES =====================
const $ = (id) => document.getElementById(id);

// ===================== COLORS =====================
const CK_COLORS = {
  mintgreen: ["#cdf5d4", "#43edac", "#9ad7a5"],
  sizzurp: ["#dfdffa", "#7c40ff", "#c1c1ea"],
  chestnut: ["#efe1da", "#a56429", "#d4beb3"],
  strawberry: ["#ffe0e5", "#ef4b62", "#efbaba"],
  sapphire: ["#d3e8ff", "#4c7aef", "#a2c2eb"],
  forgetmenot: ["#dcebfc", "#4eb4f9", "#a7caea"],
  dahlia: ["#e6eafd", "#b8bdff", "#bec5e7"],
  coralsunrise: ["#fde9e4", "#ff9088", "#e7c3bb"],
  olive: ["#ecf4e0", "#729100", "#c8d6b4"],
  pinefresh: ["#dbf0d0", "#177a25", "#adcf9b"],
  oasis: ["#e6faf3", "#ccffef", "#bee1d4"],
  dioscuri: ["#e5e7ef", "#484c5b", "#cdd1e0"],
  palejade: ["#e7f1ed", "#c3d8cf", "#c0d1ca"],
  parakeet: ["#e5f3e2", "#49b749", "#bcd4b8"],
  cyan: ["#c5eefa", "#45f0f4", "#83cbe0"],
  topaz: ["#d1eeeb", "#0ba09c", "#a8d5d1"],
  limegreen: ["#d9f5cb", "#aef72f", "#b4d9a2"],
  isotope: ["#effdca", "#e4ff73", "#cde793"],
  babypuke: ["#eff1e0", "#bcba5e", "#cfd4b0"],
  bubblegum: ["#fadff4", "#ef52d1", "#eebce3"],
  twilightsparkle: ["#ede2f5", "#ba8aff", "#dcc7ec"],
  doridnudibranch: ["#faeefa", "#fa9fff", "#e1cce1"],
  pumpkin: ["#fae1ca", "#ffa039", "#efc8a4"],
  autumnmoon: ["#fdf3e0", "#ffe8bb", "#e7d4b4"],
  bridesmaid: ["#ffd5e5", "#ffc2df", "#eba3bc"],
  thundergrey: ["#eee9e8", "#828282", "#dbccc7"],
  greymatter: ["#e5e7ef", "#828282", "#cdd1e0"],
  downbythebay: ["#cde5d1", "#4e8b57", "#97bc9c"],
  eclipse: ["#e5e7ef", "#484c5b", "#cdd1e0"],
  gold: ["#faf4cf", "#fcdf35", "#e3daa1"],
  shadowgrey: ["#b1aeb9", "#575553", "#8a8792"],
  salmon: ["#fde9e4", "#ef4b62", "#efbaba"],
  cottoncandy: ["#ffd5e5", "#ffc2df", "#eba3bc"],
  cloudwhite: ["#f9f8f6", "#e7e6e4", "#d5d4d2"],
  mauveover: ["#ede2f5", "#ba8aff", "#dcc7ec"],
  hintomint: ["#cdf5d4", "#43edac", "#9ad7a5"],
  bananacream: ["#fdf3e0", "#ffe8bb", "#e7d4b4"],
  default: ["#23283b", "#000000", "#1a1d2a"]
};

function getKittyColors(kitty) {
  const colorName = (kitty.color || "").toLowerCase();
  const hasKnownColor = colorName && CK_COLORS[colorName];
  const colors = CK_COLORS[colorName] || CK_COLORS.default;
  const background = kitty.background_color || kitty.kitty_color || colors[0];
  const shadow = kitty.shadow_color || colors[2] || darkenColor(background, 0.35);
  return { background, shadow, isUnknown: !kitty.background_color && !kitty.kitty_color && !hasKnownColor };
}

function darkenColor(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "rgba(0,0,0,0.3)";
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function brightenHex(hex, amt = 0.22) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.round(r + (255 - r) * amt));
  g = Math.min(255, Math.round(g + (255 - g) * amt));
  b = Math.min(255, Math.round(b + (255 - b) * amt));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return { r: 35, g: 40, b: 59 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// ===================== MEWTATIONS =====================
const GEM_IMAGES = {
  diamond: "./images/cattributes/mewtation-gems/diamond.svg",
  gold: "./images/cattributes/mewtation-gems/gold.svg",
  silver: "./images/cattributes/mewtation-gems/silver.svg",
  bronze: "./images/cattributes/mewtation-gems/bronze.svg"
};

function getMewtationGems(kitty) {
  const gems = [];
  const raw = kitty.raw || kitty;
  const enhanced = raw.enhanced_cattributes || [];
  const id = Number(kitty.id);

  for (const attr of enhanced) {
    if (attr.kittyId === id && typeof attr.position === "number" && attr.position > 0 && attr.position <= 500) {
      let gemType;
      if (attr.position === 1) gemType = "diamond";
      else if (attr.position <= 10) gemType = "gold";
      else if (attr.position <= 100) gemType = "silver";
      else gemType = "bronze";

      gems.push({ type: attr.type, description: attr.description, position: attr.position, gem: gemType });
    }
  }
  return gems;
}

function gemDisplayName(gemType) {
  const names = { diamond: "Diamond", gold: "Gilded", silver: "Amethyst", bronze: "Lapis" };
  return names[gemType] || gemType;
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

// ===================== NORMALIZATION =====================
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

function shortAddr(a) {
  if (!a || typeof a !== "string") return "";
  if (a.length <= 12) return a;
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function lookupOwnerNickname(addr) {
  if (!addr) return null;
  const addrLower = addr.toLowerCase();
  for (const k of CKGraph.kittyById.values()) {
    const kAddr = k.owner_address || normalizeOwner(k.owner);
    if (kAddr && kAddr.toLowerCase() === addrLower) {
      const nick = k.owner_nickname || normalizeOwnerNickname(k);
      if (nick) return nick;
    }
  }
  return null;
}

// ===================== AUCTION CONTRACTS =====================
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

// ===================== FORMATTING =====================
function formatDatePretty(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
  } catch { return dateStr; }
}

function formatDateTimeFull(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-US", { timeZoneName: "short" });
  } catch {
    return dateStr;
  }
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

function safeText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function nodeLabel(k) {
  return k.name ? k.name : `Kitty ${k.id}`;
}

// ===================== API / DATA LOADING =====================
async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

function unwrapKitty(obj) {
  if (obj && typeof obj === "object" && obj.kitty && typeof obj.kitty === "object") return obj.kitty;
  return obj;
}

function normalizeFromApi(raw) {
  const id = Number(raw.id);
  const generation = (typeof raw.generation === "number") ? raw.generation : (Number.isFinite(Number(raw.generation)) ? Number(raw.generation) : null);

  const matron_id = raw.matron_id ?? raw.matronId ?? (raw.matron && raw.matron.id ? Number(raw.matron.id) : null);
  const sire_id = raw.sire_id ?? raw.sireId ?? (raw.sire && raw.sire.id ? Number(raw.sire.id) : null);

  const background_color = raw.background_color || raw.backgroundColor || null;
  const color = raw.color || null;
  const image_url = raw.image_url || raw.imageUrl || raw.image_url_cdn || raw.imageUrlCdn || null;

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
    color,
    background_color,
    kitty_color: background_color || null,
    shadow_color: raw.shadow_color || raw.shadowColor || null,
    image_url,
    owner: raw.owner || raw.owner_profile || raw.owner_address || raw.ownerAddress || null,
    owner_wallet_address: raw.owner_wallet_address || null,
    matron_id: matron_id ? Number(matron_id) : null,
    sire_id: sire_id ? Number(sire_id) : null,
    enhanced_cattributes: enhanced,
    traits,
    raw
  };
}

// ===================== DEFAULTS / CONFIG =====================
function getDefaultsRaw() {
  return (window.CK_GRAPH_DEFAULTS && typeof window.CK_GRAPH_DEFAULTS === "object") ? window.CK_GRAPH_DEFAULTS : {};
}

function debugLevel() {
  const d = getDefaultsRaw();
  const n = Number(d.debugLevel);
  return Number.isFinite(n) ? n : 1;
}

function log(...args) {
  if (debugLevel() >= 1) console.log("[CKGRAPH]", ...args);
}

function logv(...args) {
  if (debugLevel() >= 2) console.log("[CKGRAPH:VV]", ...args);
}

function defaults() {
  const d = getDefaultsRaw();
  return {
    proxyUrl: d.proxyUrl || "",
    useProxy: (typeof d.useProxy === "boolean") ? d.useProxy : false,
    svgBaseUrl: d.svgBaseUrl || "",
    svgFromApi: (typeof d.svgFromApi === "boolean") ? d.svgFromApi : true,
    siteBaseUrl: d.siteBaseUrl || "https://www.cryptokitties.co",
    dataUrl: d.dataUrl || ""
  };
}

function siteBase() {
  return defaults().siteBaseUrl.replace(/\/$/, "");
}

function kittyUrl(id) {
  return `${siteBase()}/kitty/${id}`;
}

function cattributeUrl(traitValue) {
  return `${siteBase()}/catalogue/cattribute/${encodeURIComponent(traitValue)}`;
}

function ownerUrl(addr) {
  return addr ? `${siteBase()}/profile/${addr}` : "";
}

function apiUrl(path) {
  return `https://api.cryptokitties.co/v3${path}`;
}

// ===================== STATUS BANNER =====================
function setStatus(msg, isError = false) {
  const bannerEl = $("banner");
  if (bannerEl) {
    bannerEl.textContent = msg;
    bannerEl.style.display = "block";
    bannerEl.style.borderColor = isError ? "rgba(255,107,107,0.55)" : "rgba(122,162,255,0.45)";
    bannerEl.style.color = isError ? "rgba(255,200,200,0.95)" : "rgba(151,163,182,0.95)";
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(() => { bannerEl.style.display = "none"; }, 2400);
  }
}

// ===================== SHARED GRAPH STATE =====================
// Central state object shared between 2D and 3D viewers
const CKGraph = {
  // Data state
  kittyById: new Map(),
  myKittyIds: new Set(),
  expandedIds: new Set(),
  cachedApiResponses: new Map(),
  loadedFromDataUrl: null,

  // Filter state
  generationHighlightActive: false,
  generationRangeMin: null,
  generationRangeMax: null,
  mewtationHighlightActive: false,
  highlightedGemTypes: new Set(),

  // Selection state
  selectedNodeId: null,
  shortestPathMode: false,
  lockedPathToId: null,

  // Owner highlight state
  ownerHighlightLocked: false,
  lockedOwnerAddr: null,
  lockedOwnerNick: null,

  // Trait/gem hover highlight
  highlightedTraitGemNodes: new Set(),

  // Foreign viewport for round-trip preservation
  foreignCam2d: null,
  foreignCam3d: null,

  // UI callbacks (set by viewers)
  onKittyAdded: null,        // (kitty, isNew) => void
  onDataLoaded: null,        // () => void
  onFilterChanged: null,     // () => void
  onSelectionChanged: null,  // (nodeId) => void
  onRefresh: null,           // () => void - refresh graph rendering

  // Reset state (called before loading new data)
  reset() {
    this.kittyById.clear();
    this.myKittyIds.clear();
    this.expandedIds.clear();
    this.cachedApiResponses.clear();
    this.loadedFromDataUrl = null;
    this.highlightedTraitGemNodes.clear();
  }
};
window.CKGraph = CKGraph;

// ===================== PATH FINDING =====================
function buildAdjacency() {
  const adj = new Map();
  const add = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  };
  for (const k of CKGraph.kittyById.values()) {
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

// ===================== FILTER MATCHING =====================
function doesKittyMatchFilters(k) {
  if (!k) return false;

  if (CKGraph.generationHighlightActive) {
    if (typeof k.generation !== "number") return false;
    const inRange =
      (CKGraph.generationRangeMin === null || k.generation >= CKGraph.generationRangeMin) &&
      (CKGraph.generationRangeMax === null || k.generation <= CKGraph.generationRangeMax);
    if (!inRange) return false;
  }

  if (CKGraph.mewtationHighlightActive) {
    const gems = getMewtationGems(k);
    if (gems.length === 0) return false;
    if (CKGraph.highlightedGemTypes.size > 0) {
      let hasMatch = false;
      for (const gem of gems) {
        if (CKGraph.highlightedGemTypes.has(gem.gem)) { hasMatch = true; break; }
      }
      if (!hasMatch) return false;
    }
  }

  return true;
}

// ===================== DATA LOADING =====================
function loadJsonObject(obj) {
  CKGraph.reset();

  const roots = Array.isArray(obj.root_ids) ? obj.root_ids.map(Number) : [];
  CKGraph.myKittyIds = new Set(roots);

  const kitties = Array.isArray(obj.kitties) ? obj.kitties : [];
  log("loadJsonObject:", { roots: roots.length, kitties: kitties.length });

  for (const k of kitties) {
    const kk = (k && typeof k.id !== "undefined") ? k : normalizeFromApi(k);
    if (!kk || !kk.id) continue;
    CKGraph.kittyById.set(Number(kk.id), kk);
    if (CKGraph.onKittyAdded) CKGraph.onKittyAdded(kk, true);
  }

  if (CKGraph.onDataLoaded) CKGraph.onDataLoaded();
  setStatus(`Loaded ${kitties.length} kitties`, false);
}

async function loadJsonFromUrl(url) {
  log("loadJsonFromUrl:", url);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  loadJsonObject(data);
  // Set after loadJsonObject since reset() clears it
  CKGraph.loadedFromDataUrl = url;
}

async function loadKittiesById(ids, noExpand = false) {
  if (!ids || ids.length === 0) return;
  log("loadKittiesById:", ids, "noExpand:", noExpand);
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
        if (Array.isArray(kObj.children) && kObj.children.length > 0) {
          for (const child of kObj.children) {
            if (child && typeof child === "object" && child.id) {
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

    // Lazy pre-fetch embedded kitties in background
    if (!noExpand && embeddedData.size > 0) {
      const embeddedIds = Array.from(embeddedData.keys());
      log("loadKittiesById: starting lazy pre-fetch for", embeddedIds.length, "embedded kitties");
      setTimeout(() => lazyPrefetchEmbedded(embeddedIds), 500);
    }
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
    for (const id of ids) {
      const numId = Number(id);
      if (CKGraph.kittyById.has(numId)) {
        log("addKittiesById: skipping already loaded", numId);
        continue;
      }
      if (fetchedIds.has(numId)) continue;
      fetchedIds.add(numId);

      const kitty = await fetchJson(apiUrl(`/kitties/${numId}`));
      const kObj = unwrapKitty(kitty);
      const normalized = normalizeFromApi(kObj);
      kittiesToAdd.push(normalized);

      if (!noExpand) {
        if (kObj.matron && kObj.matron.id) {
          const matronId = Number(kObj.matron.id);
          if (!CKGraph.kittyById.has(matronId) && !requestedIds.has(matronId) && !embeddedData.has(matronId)) {
            embeddedData.set(matronId, normalizeFromApi(kObj.matron));
          }
        }
        if (kObj.sire && kObj.sire.id) {
          const sireId = Number(kObj.sire.id);
          if (!CKGraph.kittyById.has(sireId) && !requestedIds.has(sireId) && !embeddedData.has(sireId)) {
            embeddedData.set(sireId, normalizeFromApi(kObj.sire));
          }
        }
        if (Array.isArray(kObj.children)) {
          for (const child of kObj.children) {
            if (child && child.id) {
              const childId = Number(child.id);
              if (!CKGraph.kittyById.has(childId) && !requestedIds.has(childId) && !embeddedData.has(childId)) {
                const childNorm = normalizeFromApi(child);
                if (!childNorm.matron_id) childNorm.matron_id = id;
                else if (!childNorm.sire_id) childNorm.sire_id = id;
                embeddedData.set(childId, childNorm);
              }
            }
          }
        }
      }
    }

    for (const [embId, embKitty] of embeddedData) {
      if (!CKGraph.kittyById.has(embId) && !fetchedIds.has(embId)) {
        kittiesToAdd.push(embKitty);
      }
    }

    if (kittiesToAdd.length === 0) {
      setStatus("All kitties already in graph", false);
      return;
    }

    // Add to existing data
    CKGraph.myKittyIds = new Set([...CKGraph.myKittyIds, ...requestedIds]);
    for (const k of kittiesToAdd) {
      CKGraph.kittyById.set(Number(k.id), k);
      if (CKGraph.onKittyAdded) CKGraph.onKittyAdded(k, true);
    }

    if (CKGraph.onDataLoaded) CKGraph.onDataLoaded();
    setStatus(`Added ${kittiesToAdd.length} kitty(s) to graph`, false);

    // Lazy pre-fetch
    if (!noExpand && embeddedData.size > 0) {
      const embeddedIds = Array.from(embeddedData.keys());
      setTimeout(() => lazyPrefetchEmbedded(embeddedIds), 500);
    }
  } catch (e) {
    console.error(e);
    setStatus(`Failed to add kitties: ${e.message}`, true);
  }
}

async function lazyPrefetchEmbedded(embeddedIds) {
  if (!embeddedIds || embeddedIds.length === 0) return;

  log("lazyPrefetchEmbedded: starting for", embeddedIds.length, "kitties");
  const delay = 150;
  let updated = 0;

  for (const id of embeddedIds) {
    try {
      const existing = CKGraph.kittyById.get(id);
      if (existing && existing.raw && (existing.raw.children || existing.raw.matron || existing.raw.sire)) {
        logv("lazyPrefetchEmbedded: skipping", id, "(already has full data)");
        continue;
      }

      logv("lazyPrefetchEmbedded: fetching", id);
      const kitty = await fetchJson(apiUrl(`/kitties/${id}`));
      const kObj = unwrapKitty(kitty);
      const normalized = normalizeFromApi(kObj);

      const merged = existing ? { ...existing, ...normalized } : normalized;
      if (existing) {
        if (!merged.matron_id && existing.matron_id) merged.matron_id = existing.matron_id;
        if (!merged.sire_id && existing.sire_id) merged.sire_id = existing.sire_id;
      }

      CKGraph.kittyById.set(id, merged);
      CKGraph.cachedApiResponses.set(id, kObj);

      if (CKGraph.onKittyAdded) CKGraph.onKittyAdded(merged, false);

      updated++;
      await new Promise(r => setTimeout(r, delay));
    } catch (e) {
      log("lazyPrefetchEmbedded: failed for", id, e.message);
    }
  }

  log("lazyPrefetchEmbedded: completed, updated", updated, "of", embeddedIds.length);
  if (CKGraph.onDataLoaded) CKGraph.onDataLoaded();
}

async function expandFamily(id) {
  if (!id) return;
  if (CKGraph.expandedIds.has(id)) {
    setStatus(`Already expanded ${id}`, false);
    return;
  }
  CKGraph.expandedIds.add(id);

  log("expandFamily:", id);

  try {
    let kObj;
    if (CKGraph.cachedApiResponses.has(id)) {
      log("expandFamily: using cached API response for", id);
      kObj = CKGraph.cachedApiResponses.get(id);
      CKGraph.cachedApiResponses.delete(id);
    } else {
      const kitty = await fetchJson(apiUrl(`/kitties/${id}`));
      kObj = unwrapKitty(kitty);
    }

    const kittiesToAdd = [normalizeFromApi(kObj)];

    if (kObj.matron && typeof kObj.matron === "object" && kObj.matron.id) {
      log("expandFamily: extracting embedded matron", kObj.matron.id);
      kittiesToAdd.push(normalizeFromApi(kObj.matron));
    }

    if (kObj.sire && typeof kObj.sire === "object" && kObj.sire.id) {
      log("expandFamily: extracting embedded sire", kObj.sire.id);
      kittiesToAdd.push(normalizeFromApi(kObj.sire));
    }

    if (Array.isArray(kObj.children) && kObj.children.length > 0) {
      log("expandFamily: extracting", kObj.children.length, "embedded children");

      for (const child of kObj.children) {
        if (child && typeof child === "object" && child.id) {
          const childId = Number(child.id);
          const existing = CKGraph.kittyById.get(childId);

          if (existing && existing.matron_id && existing.sire_id) {
            log("expandFamily: child", childId, "already has both parents, skipping");
            continue;
          }

          const normalized = normalizeFromApi(child);

          if (!existing) {
            if (!normalized.matron_id) normalized.matron_id = id;
            else if (!normalized.sire_id) normalized.sire_id = id;
          } else {
            if (existing.matron_id && !existing.sire_id) {
              normalized.sire_id = id;
            } else if (existing.sire_id && !existing.matron_id) {
              normalized.matron_id = id;
            }
          }

          kittiesToAdd.push(normalized);
        }
      }
    }

    log("expandFamily: adding", kittiesToAdd.length, "kitties");

    for (const k of kittiesToAdd) {
      const existing = CKGraph.kittyById.get(Number(k.id));
      if (existing) {
        if (k.matron_id && !existing.matron_id) existing.matron_id = k.matron_id;
        if (k.sire_id && !existing.sire_id) existing.sire_id = k.sire_id;
        for (const [key, val] of Object.entries(k)) {
          if (val !== null && val !== undefined && val !== "") {
            existing[key] = val;
          }
        }
        if (CKGraph.onKittyAdded) CKGraph.onKittyAdded(existing, false);
      } else {
        CKGraph.kittyById.set(Number(k.id), k);
        if (CKGraph.onKittyAdded) CKGraph.onKittyAdded(k, true);
      }
    }

    if (CKGraph.onDataLoaded) CKGraph.onDataLoaded();
    setStatus(`Expanded family for kitty ${id}`, false);
  } catch (e) {
    console.error(e);
    setStatus(`Failed to expand family: ${e.message}`, true);
    CKGraph.expandedIds.delete(id);
  }
}

// ===================== HIGHLIGHT LOGIC =====================
function highlightByTrait(traitValue) {
  if (!traitValue) return;
  CKGraph.highlightedTraitGemNodes.clear();

  for (const [id, k] of CKGraph.kittyById.entries()) {
    const traits = k.traits || {};
    for (const val of Object.values(traits)) {
      if (val && val.toLowerCase() === traitValue.toLowerCase()) {
        CKGraph.highlightedTraitGemNodes.add(id);
        break;
      }
    }
  }

  log("highlightByTrait:", { traitValue, count: CKGraph.highlightedTraitGemNodes.size });
  if (CKGraph.onRefresh) CKGraph.onRefresh();
}

function highlightByGemType(gemType) {
  if (!gemType) return;
  CKGraph.highlightedTraitGemNodes.clear();

  for (const [id, k] of CKGraph.kittyById.entries()) {
    const gems = getMewtationGems(k);
    if (gems.some(g => g.gem === gemType)) {
      CKGraph.highlightedTraitGemNodes.add(id);
    }
  }

  log("highlightByGemType:", { gemType, count: CKGraph.highlightedTraitGemNodes.size });
  if (CKGraph.onRefresh) CKGraph.onRefresh();
}

function clearTraitGemHighlight() {
  CKGraph.highlightedTraitGemNodes.clear();
  if (CKGraph.onRefresh) CKGraph.onRefresh();
}

function highlightOwnerKitties(ownerAddr, ownerNick) {
  if (!ownerAddr && !ownerNick) return;
  const ownerAddrLower = ownerAddr ? ownerAddr.toLowerCase() : null;
  const ownerNickLower = ownerNick ? ownerNick.toLowerCase() : null;
  let count = 0;

  for (const k of CKGraph.kittyById.values()) {
    if (doesKittyMatchOwner(k, ownerAddrLower, ownerNickLower)) {
      count++;
    }
  }

  log("highlightOwnerKitties:", { ownerAddr, ownerNick, count });
  if (CKGraph.onRefresh) CKGraph.onRefresh();
}

// ===================== PERMALINK GENERATION =====================
function generatePermalinkParams() {
  const params = new URLSearchParams();

  // Data source
  if (CKGraph.loadedFromDataUrl && CKGraph.expandedIds.size === 0) {
    params.set("dataUrl", CKGraph.loadedFromDataUrl);
  } else if (CKGraph.kittyById.size > 0) {
    const allIds = Array.from(CKGraph.kittyById.keys()).sort((a, b) => a - b);
    params.set("kitties", allIds.join(","));
    params.set("noExpand", "true");
  }

  // Filters
  if (CKGraph.generationHighlightActive) {
    if (CKGraph.generationRangeMin !== null) params.set("genMin", CKGraph.generationRangeMin);
    if (CKGraph.generationRangeMax !== null) params.set("genMax", CKGraph.generationRangeMax);
  }

  if (CKGraph.mewtationHighlightActive) {
    if (CKGraph.highlightedGemTypes.size === 0) {
      params.set("mewtations", "all");
    } else {
      params.set("mewtations", Array.from(CKGraph.highlightedGemTypes).join(","));
    }
  }

  // Selection
  if (CKGraph.selectedNodeId) params.set("selected", CKGraph.selectedNodeId);
  if (CKGraph.shortestPathMode) params.set("shortestPath", "true");
  if (CKGraph.lockedPathToId && CKGraph.selectedNodeId) {
    params.set("pathFrom", CKGraph.selectedNodeId);
    params.set("pathTo", CKGraph.lockedPathToId);
  }

  return params;
}

// ===================== QUERY PARAM PARSING =====================
function parseCommonQueryParams() {
  const params = new URLSearchParams(location.search);
  const result = {
    kittyIds: null,
    dataUrl: null,
    noExpand: false,
    selected: null,
    shortestPath: false,
    pathFrom: null,
    pathTo: null,
    genMin: null,
    genMax: null,
    mewtations: null
  };

  // Data params
  const kittyParam = params.get("kitty") || params.get("kitties");
  if (kittyParam) {
    result.kittyIds = kittyParam.split(/[,\\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => n && !isNaN(n));
  }
  result.dataUrl = params.get("dataUrl");
  result.noExpand = params.get("noExpand") === "true";

  // Selection/path params
  const selectedParam = params.get("selected");
  if (selectedParam) result.selected = Number(selectedParam);
  result.shortestPath = params.get("shortestPath") === "true";
  const pathFromParam = params.get("pathFrom");
  const pathToParam = params.get("pathTo");
  if (pathFromParam) result.pathFrom = Number(pathFromParam);
  if (pathToParam) result.pathTo = Number(pathToParam);

  // Filter params
  const genMinParam = params.get("genMin");
  const genMaxParam = params.get("genMax");
  if (genMinParam) result.genMin = Number(genMinParam);
  if (genMaxParam) result.genMax = Number(genMaxParam);
  result.mewtations = params.get("mewtations");

  // Foreign viewport params (for round-trip preservation)
  const cam2dParam = params.get("cam2d");
  const cam3dParam = params.get("cam3d");
  if (cam2dParam && cam2dParam.length < 100) CKGraph.foreignCam2d = cam2dParam;
  if (cam3dParam && cam3dParam.length < 200) CKGraph.foreignCam3d = cam3dParam;

  return result;
}

function applyFilterParams(genMin, genMax, mewtations) {
  // Generation filter
  if (genMin !== null || genMax !== null) {
    CKGraph.generationHighlightActive = true;
    CKGraph.generationRangeMin = genMin;
    CKGraph.generationRangeMax = genMax;
  }

  // Mewtation filter
  if (mewtations) {
    CKGraph.mewtationHighlightActive = true;
    if (mewtations === "all") {
      CKGraph.highlightedGemTypes = new Set();
    } else {
      const types = mewtations.split(",").map(s => s.trim().toLowerCase());
      CKGraph.highlightedGemTypes = new Set(types);
    }
  }
}

// ===================== EXPOSE FUNCTIONS VIA CKGRAPH =====================
CKGraph.loadJsonObject = loadJsonObject;
CKGraph.loadJsonFromUrl = loadJsonFromUrl;
CKGraph.loadKittiesById = loadKittiesById;
CKGraph.addKittiesById = addKittiesById;
CKGraph.lazyPrefetchEmbedded = lazyPrefetchEmbedded;
CKGraph.expandFamily = expandFamily;
CKGraph.findShortestPath = findShortestPath;
CKGraph.doesKittyMatchFilters = doesKittyMatchFilters;
CKGraph.highlightByTrait = highlightByTrait;
CKGraph.highlightByGemType = highlightByGemType;
CKGraph.clearTraitGemHighlight = clearTraitGemHighlight;
CKGraph.highlightOwnerKitties = highlightOwnerKitties;
CKGraph.generatePermalinkParams = generatePermalinkParams;
CKGraph.parseCommonQueryParams = parseCommonQueryParams;

