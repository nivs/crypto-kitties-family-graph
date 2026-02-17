#!/usr/bin/env python3
"""
Trace Dragon's ancestry to create a demo showing:
- Dragon's full ancestry tree (all ancestors, not just shortest path)
- #1461 highlighted as the notable ancestor

Usage:
  python3 trace_dragon_ancestry.py
"""

import json
import requests
import time
from collections import deque
from typing import Dict, List, Optional, Any, Set

API_BASE = "https://api.cryptokitties.co/v3"
KITTIES_ENDPOINT = f"{API_BASE}/kitties"

MAX_RETRIES = 8
BACKOFF_BASE_S = 0.75

DRAGON_ID = 896775
TARGET_ID = 1461


def request_with_retry(url: str, timeout: int = 30) -> Optional[requests.Response]:
    """Make a GET request with exponential backoff retry."""
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 429:
                sleep_time = BACKOFF_BASE_S * (2 ** attempt)
                print(f"  429 rate limited, sleeping {sleep_time:.2f}s")
                time.sleep(sleep_time)
                continue
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp
        except requests.exceptions.RequestException as e:
            last_err = e
            sleep_time = BACKOFF_BASE_S * (2 ** attempt)
            print(f"  Request failed ({e}), retrying...")
            time.sleep(sleep_time)
    print(f"  Failed after {MAX_RETRIES} retries: {url}")
    return None


def fetch_kitty(kitty_id: int) -> Optional[Dict[str, Any]]:
    resp = request_with_retry(f"{KITTIES_ENDPOINT}/{kitty_id}")
    if resp:
        return resp.json()
    return None


def fetch_full_ancestry(start_id: int, max_depth: int = 12) -> Dict[int, Any]:
    """
    Fetch full ancestry tree (both parents at each level).
    Returns dict of kitty_id -> kitty data.
    """
    kitties: Dict[int, Any] = {}
    queue = deque([(start_id, 0)])

    print(f"Fetching full ancestry of #{start_id} (max depth {max_depth})...")

    while queue:
        kid, depth = queue.popleft()

        if depth > max_depth:
            continue
        if kid in kitties:
            continue

        print(f"  Depth {depth}: fetching #{kid}...")
        k = fetch_kitty(kid)
        if not k:
            continue

        kitties[kid] = k
        gen = k.get('generation', '?')
        name = k.get('name', 'unnamed')

        # Extract parent IDs
        matron = k.get('matron_id') or (k.get('matron', {}) or {}).get('id')
        sire = k.get('sire_id') or (k.get('sire', {}) or {}).get('id')

        print(f"    -> {name} (Gen {gen}), parents: {matron}, {sire}")

        # Queue both parents
        if matron:
            queue.append((int(matron), depth + 1))
        if sire:
            queue.append((int(sire), depth + 1))

        time.sleep(0.15)

    return kitties


def find_path_to_target(kitties: Dict[int, Any], start_id: int, target_id: int) -> Optional[List[int]]:
    """Find path from start to target through ancestry."""
    if target_id not in kitties:
        return None

    # BFS through the fetched kitties
    visited = set()
    queue = deque([(start_id, [start_id])])

    while queue:
        kid, path = queue.popleft()

        if kid == target_id:
            return path

        if kid in visited or kid not in kitties:
            continue
        visited.add(kid)

        k = kitties[kid]
        matron = k.get('matron_id') or (k.get('matron', {}) or {}).get('id')
        sire = k.get('sire_id') or (k.get('sire', {}) or {}).get('id')

        if matron:
            queue.append((int(matron), path + [int(matron)]))
        if sire:
            queue.append((int(sire), path + [int(sire)]))

    return None


def main():
    # Fetch Dragon's full ancestry tree
    kitties = fetch_full_ancestry(DRAGON_ID, max_depth=12)

    print(f"\nFetched {len(kitties)} ancestors")

    # Check if #1461 is in the ancestry
    if TARGET_ID in kitties:
        print(f"\n✓ #{TARGET_ID} found in Dragon's ancestry!")

        # Find the specific path
        path = find_path_to_target(kitties, DRAGON_ID, TARGET_ID)
        if path:
            print(f"\nShortest path ({len(path)} generations):")
            print(f"  {' -> '.join(str(x) for x in path)}")
    else:
        print(f"\n✗ #{TARGET_ID} not found in fetched ancestry")
        print("  Try increasing max_depth")

    # Build output JSON
    output = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "description": f"Dragon (#{DRAGON_ID}) full ancestry tree - #{TARGET_ID} is a notable ancestor",
        "root_ids": [DRAGON_ID],
        "notable_ancestor": TARGET_ID,
        "kitties": list(kitties.values())
    }

    out_path = '../dist/examples/shortest_path/dragon_1461_connection.json'
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n✓ Wrote {len(kitties)} kitties to {out_path}")

    # Stats
    gens = {}
    for k in kitties.values():
        g = k.get('generation', '?')
        gens[g] = gens.get(g, 0) + 1
    print(f"\nBy generation: {dict(sorted(gens.items()))}")


if __name__ == '__main__':
    main()
