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
  }
  return null;
}

function shortAddr(a) {
  if (!a || typeof a !== "string") return "";
  if (a.length <= 12) return a;
  return a.slice(0, 6) + "…" + a.slice(-4);
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
