#!/usr/bin/env python3
"""
CryptoKitties aggregation JSON generator (API v3)

What it does
- Starts from root kitty IDs (via --ids or --ids-file)
- Recursively fetches:
  - parents (matron + sire) up to --parents levels
  - children up to --children levels
- Optionally, when discovering children, also fetch some parent levels for each child via --child-parent-levels
- Computes:
  - kitty_color (prefers API background_color; else uses color-name palette parsed from CK CSS; else None)
  - shadow_color (derived from kitty_color by darken or lighten)
- Writes a single JSON file containing:
  - config, root_ids, counts, errors
  - included_by (why each kitty was included)
  - kitties (normalized objects with raw API payload attached)

Verbosity
- Default: warnings only
- -v: INFO
- -vv: DEBUG

Examples
- From comma list:
  python3 ck_fetch.py --ids "124653,129868,148439" --parents 4 --children 2 -v --out ck.json
- From ids-file:
  python3 ck_fetch.py --ids-file my_kitties_ids.txt --parents 4 --children 2 -vv --out ck.json
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import time
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlencode

import requests

API_BASE = "https://api.cryptokitties.co/v3"
KITTIES_ENDPOINT = f"{API_BASE}/kitties"

# Filled at runtime by parsing the CSS palette (unless disabled)
COLOR_NAME_TO_BG: Dict[str, str] = {}


def now_utc_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def is_intlike(x: Any) -> bool:
    try:
        int(x)
        return True
    except Exception:
        return False


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def hex_to_rgb01(h: str) -> Optional[Tuple[float, float, float]]:
    if not isinstance(h, str):
        return None
    h = h.strip()
    if not re.fullmatch(r"#?[0-9a-fA-F]{6}", h):
        return None
    if h[0] != "#":
        h = "#" + h
    r = int(h[1:3], 16) / 255.0
    g = int(h[3:5], 16) / 255.0
    b = int(h[5:7], 16) / 255.0
    return (r, g, b)


def rgb01_to_hex(rgb: Tuple[float, float, float]) -> str:
    r = int(round(clamp01(rgb[0]) * 255))
    g = int(round(clamp01(rgb[1]) * 255))
    b = int(round(clamp01(rgb[2]) * 255))
    return f"#{r:02x}{g:02x}{b:02x}"


def mix(a: Tuple[float, float, float], b: Tuple[float, float, float], t: float) -> Tuple[float, float, float]:
    t = clamp01(t)
    return (
        a[0] * (1 - t) + b[0] * t,
        a[1] * (1 - t) + b[1] * t,
        a[2] * (1 - t) + b[2] * t,
    )


def lighten(hex_color: str, t: float) -> Optional[str]:
    rgb = hex_to_rgb01(hex_color)
    if rgb is None:
        return None
    return rgb01_to_hex(mix(rgb, (1.0, 1.0, 1.0), t))


def darken(hex_color: str, t: float) -> Optional[str]:
    rgb = hex_to_rgb01(hex_color)
    if rgb is None:
        return None
    return rgb01_to_hex(mix(rgb, (0.0, 0.0, 0.0), t))


def build_palette_from_css(css_text: str) -> Dict[str, str]:
    """
    Extract a mapping of color-name -> hex from CryptoKitties CSS.

    Tries multiple patterns:
      --mintgreen: #cdf5d4;
      --color-mintgreen: #cdf5d4;
      .mintgreen { background-color: #cdf5d4; }
      .bg-mintgreen { background-color: #cdf5d4; }
    """
    palette: Dict[str, str] = {}

    # CSS variables: --mintgreen: #aabbcc; or --color-mintgreen: #aabbcc;
    for m in re.finditer(r"--(?:color-)?([a-z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;", css_text):
        name = m.group(1).lower().strip()
        hx = m.group(2).lower()
        if 3 <= len(name) <= 32 and re.fullmatch(r"[a-z][a-z0-9_-]*", name):
            palette.setdefault(name, hx)

    # CSS classes: .bg-mintgreen{background-color:#aabbcc}
    for m in re.finditer(
        r"\.(?:bg-)?([a-z0-9_-]+)\s*\{[^}]*background-color\s*:\s*(#[0-9a-fA-F]{6})\s*;[^}]*\}",
        css_text,
        flags=re.DOTALL,
    ):
        name = m.group(1).lower().strip()
        hx = m.group(2).lower()
        if 3 <= len(name) <= 32 and re.fullmatch(r"[a-z][a-z0-9_-]*", name):
            palette.setdefault(name, hx)

    return palette


def fetch_palette_css(css_url: str, timeout_s: int, user_agent: str) -> Dict[str, str]:
    logging.info("fetch palette css: %s", css_url)
    r = requests.get(
        css_url,
        timeout=timeout_s,
        headers={
            "Accept": "text/css,*/*;q=0.1",
            "User-Agent": user_agent,
        },
    )
    r.raise_for_status()
    palette = build_palette_from_css(r.text)
    logging.info("palette entries found: %d", len(palette))
    logging.debug("palette sample: %s", dict(list(palette.items())[:10]))
    return palette


@dataclass
class Config:
    parent_levels: int
    child_levels: int
    child_parent_levels: int
    child_page_limit: int
    request_timeout_s: int
    sleep_s: float
    max_total_kitties: int
    user_agent: str
    max_retries: int
    backoff_base_s: float
    shadow_mode: str
    shadow_factor: float
    css_url: str
    css_palette_enabled: bool


class CKClient:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json", "User-Agent": cfg.user_agent})

    def _get_json(self, url: str) -> Dict[str, Any]:
        last_err: Optional[Exception] = None
        for attempt in range(self.cfg.max_retries + 1):
            try:
                logging.debug("GET %s", url)
                resp = self.session.get(url, timeout=self.cfg.request_timeout_s)
                if resp.status_code == 429:
                    sleep = self.cfg.backoff_base_s * (2**attempt)
                    logging.warning("429 rate limited, sleeping %.2fs", sleep)
                    time.sleep(sleep)
                    continue
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                last_err = e
                sleep = self.cfg.backoff_base_s * (2**attempt)
                logging.warning("Request failed (%s), sleeping %.2fs", e, sleep)
                time.sleep(sleep)
        raise RuntimeError(f"GET failed after retries: {url} | Last error: {last_err}")

    def fetch_kitty(self, kitty_id: int) -> Dict[str, Any]:
        url = f"{KITTIES_ENDPOINT}/{kitty_id}"
        data = self._get_json(url)
        if "kitty" in data and isinstance(data["kitty"], dict):
            return data["kitty"]
        return data

    def fetch_children_ids(self, parent_id: int, limit_per_page: int) -> List[int]:
        out: List[int] = []
        page = 1

        while True:
            qs = urlencode({"parent": parent_id, "page": page, "limit": limit_per_page})
            url = f"{KITTIES_ENDPOINT}?{qs}"
            data = self._get_json(url)

            items = None
            for key in ("kitties", "items", "data", "results"):
                if key in data and isinstance(data[key], list):
                    items = data[key]
                    break
            if items is None and isinstance(data.get("data"), dict):
                for key in ("kitties", "items", "results"):
                    if key in data["data"] and isinstance(data["data"][key], list):
                        items = data["data"][key]
                        break

            if not items:
                break

            got = 0
            for it in items:
                if isinstance(it, dict) and is_intlike(it.get("id")):
                    out.append(int(it["id"]))
                    got += 1

            logging.debug("children page=%d parent=%d got=%d", page, parent_id, got)

            if got == 0:
                break
            if len(items) < limit_per_page:
                break

            page += 1
            if self.cfg.sleep_s > 0:
                time.sleep(self.cfg.sleep_s)

        seen: Set[int] = set()
        deduped: List[int] = []
        for cid in out:
            if cid not in seen:
                deduped.append(cid)
                seen.add(cid)
        return deduped


def extract_relations(kitty: Dict[str, Any]) -> Tuple[Optional[int], Optional[int]]:
    matron_id = None
    sire_id = None

    for key in ("matron_id", "matronId"):
        if is_intlike(kitty.get(key)):
            matron_id = int(kitty[key])
            break
    for key in ("sire_id", "sireId"):
        if is_intlike(kitty.get(key)):
            sire_id = int(kitty[key])
            break

    if matron_id is None and isinstance(kitty.get("matron"), dict) and is_intlike(kitty["matron"].get("id")):
        matron_id = int(kitty["matron"]["id"])
    if sire_id is None and isinstance(kitty.get("sire"), dict) and is_intlike(kitty["sire"].get("id")):
        sire_id = int(kitty["sire"]["id"])

    return matron_id, sire_id


def compute_colors(
    color_name: Optional[str],
    background_color: Optional[str],
    shadow_mode: str,
    shadow_factor: float,
) -> Tuple[Optional[str], Optional[str]]:
    kitty_color = background_color

    if not kitty_color and color_name:
        key = color_name.lower().strip()
        kitty_color = COLOR_NAME_TO_BG.get(key)

    shadow_color = None
    if kitty_color:
        shadow_color = darken(kitty_color, shadow_factor) if shadow_mode == "darken" else lighten(kitty_color, shadow_factor)

    logging.debug(
        "colors color_name=%s background_color=%s -> kitty_color=%s shadow_color=%s",
        color_name, background_color, kitty_color, shadow_color,
    )
    return kitty_color, shadow_color


def normalize_kitty(kitty: Dict[str, Any], cfg: Config) -> Dict[str, Any]:
    kid = int(kitty.get("id"))
    name = kitty.get("name") or None

    gen = kitty.get("generation") if "generation" in kitty else kitty.get("gen")
    gen = int(gen) if is_intlike(gen) else None

    matron_id, sire_id = extract_relations(kitty)

    # Extract owner address and nickname from various formats
    owner_raw = kitty.get("owner") or kitty.get("owner_profile") or None
    owner_address = None
    owner_nickname = None

    if isinstance(owner_raw, str):
        owner_address = owner_raw
    elif isinstance(owner_raw, dict):
        owner_address = owner_raw.get("address") or owner_raw.get("wallet_address") or None
        owner_nickname = owner_raw.get("nickname") or owner_raw.get("username") or owner_raw.get("name") or None

    # Also check direct fields
    if not owner_address:
        owner_address = kitty.get("owner_address") or kitty.get("ownerAddress") or kitty.get("owner_wallet_address") or None

    color_name = kitty.get("color") or None
    background_color = kitty.get("background_color") or kitty.get("backgroundColor") or None

    created_at = kitty.get("created_at") or kitty.get("createdAt") or None
    birthday = kitty.get("birthday") or None
    genes = kitty.get("genes") or None

    traits: Dict[str, Any] = {}
    enhanced = kitty.get("enhanced_cattributes") or kitty.get("enhancedCattributes") or kitty.get("cattributes")
    if isinstance(enhanced, list):
        for t in enhanced:
            if not isinstance(t, dict):
                continue
            ttype = t.get("type") or t.get("name")
            desc = t.get("description") or t.get("value")
            if ttype:
                traits[str(ttype)] = desc

    image_url = (
        kitty.get("image_url")
        or kitty.get("image_url_cdn")
        or kitty.get("imageUrl")
        or kitty.get("imageUrlCdn")
        or None
    )

    kitty_color, shadow_color = compute_colors(color_name, background_color, cfg.shadow_mode, cfg.shadow_factor)

    return {
        "id": kid,
        "name": name,
        "generation": gen,
        "created_at": created_at,
        "birthday": birthday,
        "genes": genes,
        "color": color_name,
        "background_color": background_color,
        "kitty_color": kitty_color,
        "shadow_color": shadow_color,
        "owner": owner_raw,
        "owner_address": owner_address,
        "owner_nickname": owner_nickname,
        "matron_id": matron_id,
        "sire_id": sire_id,
        "image_url": image_url,
        "traits": traits,
        "enhanced_cattributes": enhanced if isinstance(enhanced, list) else [],
        "raw": kitty,
    }


def dedupe_keep_order(ids: List[int]) -> List[int]:
    seen: Set[int] = set()
    out: List[int] = []
    for i in ids:
        if i not in seen:
            out.append(i)
            seen.add(i)
    return out


def parse_ids_from_string(s: str) -> List[int]:
    parts = [p.strip() for p in re.split(r"[,\s]+", s.strip()) if p.strip()]
    ids: List[int] = []
    for p in parts:
        if not is_intlike(p):
            raise ValueError(f"Invalid kitty id: {p}")
        ids.append(int(p))
    return dedupe_keep_order(ids)


def parse_ids_from_file(path: str) -> List[int]:
    ids: List[int] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if not is_intlike(line):
                raise ValueError(f"Invalid kitty id in file: {line}")
            ids.append(int(line))
    return dedupe_keep_order(ids)


def build_aggregation(root_ids: List[int], cfg: Config) -> Dict[str, Any]:
    client = CKClient(cfg)

    kitties_by_id: Dict[int, Dict[str, Any]] = {}
    included_by: Dict[int, Set[str]] = {}
    errors: List[Dict[str, Any]] = []
    best_depths: Dict[int, Tuple[int, int]] = {}

    # Each queue entry: (kitty_id, remaining_parent_depth, remaining_child_depth, reason)
    queue: List[Tuple[int, int, int, str]] = [(rid, cfg.parent_levels, cfg.child_levels, "root") for rid in root_ids]

    def mark(kid: int, reason: str) -> None:
        included_by.setdefault(kid, set()).add(reason)

    def maybe_enqueue(kid: Optional[int], pdepth: int, cdepth: int, reason: str) -> None:
        if kid is None:
            return
        kid = int(kid)
        if kid <= 0:
            return

        pdepth = max(0, pdepth)
        cdepth = max(0, cdepth)

        prev = best_depths.get(kid)
        if prev is not None and prev[0] >= pdepth and prev[1] >= cdepth:
            mark(kid, reason)
            return

        best_depths[kid] = (max(prev[0], pdepth) if prev else pdepth, max(prev[1], cdepth) if prev else cdepth)
        queue.append((kid, pdepth, cdepth, reason))
        mark(kid, reason)
        logging.debug("enqueue id=%d pdepth=%d cdepth=%d reason=%s", kid, pdepth, cdepth, reason)

    while queue:
        if len(kitties_by_id) >= cfg.max_total_kitties:
            logging.warning("Reached max total kitties cap: %d", cfg.max_total_kitties)
            break

        kid, pdepth, cdepth, reason = queue.pop(0)
        mark(kid, reason)

        if kid not in kitties_by_id:
            try:
                logging.info("fetch kitty=%d (pdepth=%d cdepth=%d) reason=%s", kid, pdepth, cdepth, reason)
                raw = client.fetch_kitty(kid)
                kitties_by_id[kid] = normalize_kitty(raw, cfg)
            except Exception as e:
                errors.append({"id": kid, "error": str(e)})
                logging.warning("failed kitty=%d error=%s", kid, e)
                continue

            if cfg.sleep_s > 0:
                time.sleep(cfg.sleep_s)

        kitty = kitties_by_id[kid]

        # Parents
        if pdepth > 0:
            mom = kitty.get("matron_id")
            dad = kitty.get("sire_id")
            logging.debug("parents of %d -> matron=%s sire=%s", kid, mom, dad)
            maybe_enqueue(mom, pdepth - 1, 0, f"parent_of:{kid}")
            maybe_enqueue(dad, pdepth - 1, 0, f"parent_of:{kid}")

        # Children
        if cdepth > 0:
            try:
                child_ids = client.fetch_children_ids(kid, cfg.child_page_limit)
                logging.info("children of %d -> %d ids (next depth %d)", kid, len(child_ids), cdepth - 1)
                for cid in child_ids:
                    maybe_enqueue(cid, cfg.child_parent_levels, cdepth - 1, f"child_of:{kid}")
            except Exception as e:
                errors.append({"id": kid, "error_children_fetch": str(e)})
                logging.warning("failed children fetch for %d error=%s", kid, e)

    return {
        "source": "CryptoKitties public API v3",
        "generated_at_utc": now_utc_iso(),
        "config": asdict(cfg),
        "root_ids": root_ids,
        "included_by": {str(k): sorted(list(v)) for k, v in included_by.items()},
        "kitties": [kitties_by_id[k] for k in sorted(kitties_by_id.keys())],
        "errors": errors,
        "counts": {"kitties": len(kitties_by_id), "errors": len(errors)},
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate CryptoKitties aggregation JSON with recursive parents/children.")

    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--ids", help="Comma or whitespace delimited kitty IDs, example: '1,2,3' or '1 2 3'")
    src.add_argument("--ids-file", help="Path to file with one kitty ID per line (# comments allowed)")

    ap.add_argument("--parents", type=int, default=3, help="Number of parent levels to fetch from roots")
    ap.add_argument("--children", type=int, default=2, help="Number of child levels to fetch from roots")
    ap.add_argument(
        "--child-parent-levels",
        type=int,
        default=0,
        help="When expanding children, also fetch this many parent levels for each child (default 0)",
    )

    ap.add_argument("--child-page-limit", type=int, default=100, help="Children list page size (default 100)")
    ap.add_argument("--timeout", type=int, default=30, help="Request timeout seconds (default 30)")
    ap.add_argument("--sleep", type=float, default=0.15, help="Sleep seconds between requests (default 0.15)")
    ap.add_argument("--max-total", type=int, default=5000, help="Hard cap on total kitties (default 5000)")
    ap.add_argument("--retries", type=int, default=4, help="Max retries per request (default 4)")
    ap.add_argument("--backoff", type=float, default=0.75, help="Backoff base seconds (default 0.75)")
    ap.add_argument("--out", default="cryptokitties_aggregation.json", help="Output JSON path")

    ap.add_argument(
        "--shadow-mode",
        choices=["darken", "lighten"],
        default="darken",
        help="How to derive shadow_color from kitty_color (default darken)",
    )
    ap.add_argument(
        "--shadow-factor",
        type=float,
        default=0.18,
        help="Derivation factor in [0..1]. For darken, higher is darker (default 0.18)",
    )

    ap.add_argument(
        "--css-url",
        default="https://www.cryptokitties.co/index.b4a978279e40ce1b7fbb.css",
        help="CSS file to parse for color palette",
    )
    ap.add_argument("--no-css-palette", action="store_true", help="Disable fetching CSS palette")

    ap.add_argument("-v", "--verbose", action="count", default=0, help="Increase verbosity. -v=INFO, -vv=DEBUG")

    ns = ap.parse_args()

    level = logging.WARNING
    if ns.verbose == 1:
        level = logging.INFO
    elif ns.verbose >= 2:
        level = logging.DEBUG
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")

    if ns.ids:
        root_ids = parse_ids_from_string(ns.ids)
    else:
        root_ids = parse_ids_from_file(ns.ids_file)

    cfg = Config(
        parent_levels=max(0, ns.parents),
        child_levels=max(0, ns.children),
        child_parent_levels=max(0, ns.child_parent_levels),
        child_page_limit=max(1, ns.child_page_limit),
        request_timeout_s=max(5, ns.timeout),
        sleep_s=max(0.0, ns.sleep),
        max_total_kitties=max(1, ns.max_total),
        user_agent="ck-tree-json-generator/1.3",
        max_retries=max(0, ns.retries),
        backoff_base_s=max(0.1, ns.backoff),
        shadow_mode=ns.shadow_mode,
        shadow_factor=max(0.0, min(1.0, ns.shadow_factor)),
        css_url=ns.css_url,
        css_palette_enabled=not ns.no_css_palette,
    )

    logging.info("roots=%s", root_ids)
    logging.info("config=%s", asdict(cfg))

    global COLOR_NAME_TO_BG
    if cfg.css_palette_enabled:
        try:
            COLOR_NAME_TO_BG = fetch_palette_css(cfg.css_url, timeout_s=cfg.request_timeout_s, user_agent=cfg.user_agent)
        except Exception as e:
            logging.warning("failed to fetch/parse css palette, continuing without it: %s", e)
            COLOR_NAME_TO_BG = {}
    else:
        COLOR_NAME_TO_BG = {}
        logging.info("css palette disabled")

    payload = build_aggregation(root_ids, cfg)

    out_path = os.path.abspath(ns.out)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    # Always print final status so there is no "silent success"
    print(f"Wrote: {out_path}")
    print(f"Kitties: {payload['counts']['kitties']}  Errors: {payload['counts']['errors']}")
    if payload["counts"]["errors"]:
        print("Some errors occurred. Inspect the 'errors' array in the JSON.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
