#!/usr/bin/env python3
"""
Find shortest path between two groups of CryptoKitties.

This script finds the shortest genealogical path connecting two sets of kitties
by expanding both ancestors (parents) AND descendants (children) from both sides
until they meet.

Usage:
  # Between two kitty IDs
  python3 find_shortest_path.py --from-ids 1461,896775 --to-ids 50,1003

  # From IDs to an existing JSON file
  python3 find_shortest_path.py --from-ids 1461,896775 --to-json holiday_fancies.json

  # Between two JSON files
  python3 find_shortest_path.py --from-json group_a.json --to-json group_b.json

  # Export the connected graph
  python3 find_shortest_path.py --from-ids 1461,896775 --to-json holiday_fancies.json --out connected.json

Output:
  - Prints the shortest path(s) found
  - Optionally exports a JSON with all kitties needed to connect the groups
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from collections import deque
from typing import Any, Dict, List, Optional, Set, Tuple

import requests

API_BASE = "https://api.cryptokitties.co/v3"
KITTIES_ENDPOINT = f"{API_BASE}/kitties"

# Retry configuration
MAX_RETRIES = 8
BACKOFF_BASE_S = 0.75
REQUEST_TIMEOUT_S = 30

logging.basicConfig(format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)


def request_with_retry(url: str, timeout: int = REQUEST_TIMEOUT_S) -> Optional[requests.Response]:
    """Make a GET request with exponential backoff retry."""
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            log.debug(f"GET {url}")
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 429:
                last_err = RuntimeError(f"429 rate limited: {url}")
                sleep_time = BACKOFF_BASE_S * (2 ** attempt)
                log.warning(f"429 rate limited, sleeping {sleep_time:.2f}s")
                time.sleep(sleep_time)
                continue
            if resp.status_code == 404:
                # Don't retry 404s - they're permanent
                log.debug(f"404 Not Found: {url}")
                return None
            resp.raise_for_status()
            return resp
        except requests.exceptions.RequestException as e:
            last_err = e
            sleep_time = BACKOFF_BASE_S * (2 ** attempt)
            log.warning(f"Request failed ({e}), sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)
    log.error(f"GET failed after {MAX_RETRIES} retries: {url} | Last error: {last_err}")
    return None


def fetch_kitty(kitty_id: int) -> Optional[Dict[str, Any]]:
    """Fetch a single kitty from the API."""
    resp = request_with_retry(f"{KITTIES_ENDPOINT}/{kitty_id}")
    if resp is not None:
        return resp.json()
    return None


def fetch_kitties_batch(kitty_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    """Fetch multiple kitties in a single API call."""
    if not kitty_ids:
        return {}

    results = {}
    # API supports up to 100 IDs per request
    batch_size = 100
    for i in range(0, len(kitty_ids), batch_size):
        batch = kitty_ids[i:i + batch_size]
        ids_param = ",".join(str(k) for k in batch)
        resp = request_with_retry(f"{KITTIES_ENDPOINT}?search={ids_param}&limit={len(batch)}")
        if resp is not None:
            data = resp.json()
            kitties = data.get("kitties", [])
            for k in kitties:
                results[k["id"]] = k
        else:
            # Fall back to individual fetches
            for kid in batch:
                k = fetch_kitty(kid)
                if k:
                    results[k["id"]] = k

        if i + batch_size < len(kitty_ids):
            time.sleep(0.5)  # Rate limiting between batches

    return results


def fetch_children(kitty_id: int, limit: int = 100) -> List[Dict[str, Any]]:
    """Fetch children of a kitty (where this kitty is matron or sire)."""
    children = []

    # Search for kitties where this is the matron
    resp = request_with_retry(f"{KITTIES_ENDPOINT}?matron_id={kitty_id}&limit={limit}")
    if resp is not None:
        data = resp.json()
        children.extend(data.get("kitties", []))

    # Search for kitties where this is the sire
    resp = request_with_retry(f"{KITTIES_ENDPOINT}?sire_id={kitty_id}&limit={limit}")
    if resp is not None:
        data = resp.json()
        children.extend(data.get("kitties", []))

    return children


def get_parents(kitty: Dict[str, Any]) -> List[int]:
    """Extract parent IDs from a kitty object."""
    parents = []
    matron_id = kitty.get("matron_id") or kitty.get("matron", {}).get("id")
    sire_id = kitty.get("sire_id") or kitty.get("sire", {}).get("id")
    if matron_id:
        parents.append(int(matron_id))
    if sire_id:
        parents.append(int(sire_id))
    return parents


def load_kitties_from_json(path: str) -> Dict[int, Dict[str, Any]]:
    """Load kitties from a JSON file."""
    with open(path, "r") as f:
        data = json.load(f)

    kitties = {}
    # Handle different JSON formats
    if "kitties" in data:
        for k in data["kitties"]:
            kitties[k["id"]] = k
    elif "data" in data:
        for k in data["data"]:
            kitties[k["id"]] = k
    elif isinstance(data, list):
        for k in data:
            kitties[k["id"]] = k

    return kitties


def find_shortest_paths(
    from_ids: Set[int],
    to_ids: Set[int],
    max_depth: int = 50,
    verbose: bool = False
) -> Tuple[List[List[int]], Dict[int, Dict[str, Any]]]:
    """
    Find shortest path(s) between two groups of kitties using bidirectional BFS.

    Expands both parents AND children at each step.

    Returns:
        - List of paths (each path is a list of kitty IDs)
        - Dict of all fetched kitties
    """
    if from_ids & to_ids:
        # Groups already overlap
        overlap = from_ids & to_ids
        return [[kid] for kid in overlap], {}

    all_kitties: Dict[int, Dict[str, Any]] = {}

    # neighbors[id] = set of connected kitty IDs (parents + children)
    neighbors: Dict[int, Set[int]] = {}

    # Track which side discovered each kitty and at what depth
    forward_visited: Dict[int, int] = {kid: 0 for kid in from_ids}
    backward_visited: Dict[int, int] = {kid: 0 for kid in to_ids}

    # Track the parent in the BFS tree for path reconstruction
    forward_parent: Dict[int, Optional[int]] = {kid: None for kid in from_ids}
    backward_parent: Dict[int, Optional[int]] = {kid: None for kid in to_ids}

    forward_queue: deque = deque(from_ids)
    backward_queue: deque = deque(to_ids)

    meeting_points: List[Tuple[int, int]] = []  # (from_side_id, to_side_id) pairs that connect
    best_total_depth = float('inf')

    current_depth = 0

    while current_depth < max_depth and (forward_queue or backward_queue):
        current_depth += 1

        # Expand forward (from from_ids)
        if forward_queue:
            frontier_ids = []
            while forward_queue and forward_visited.get(forward_queue[0], 0) < current_depth:
                frontier_ids.append(forward_queue.popleft())

            if frontier_ids:
                log.info(f"Forward depth {current_depth}: expanding {len(frontier_ids)} kitties")

            for kid in frontier_ids:
                # Fetch this kitty if we don't have it
                if kid not in all_kitties:
                    fetched = fetch_kitty(kid)
                    if fetched:
                        all_kitties[kid] = fetched

                kitty = all_kitties.get(kid)
                if not kitty:
                    continue

                # Get neighbors (parents + children)
                if kid not in neighbors:
                    neighbors[kid] = set()

                    # Add parents
                    parents = get_parents(kitty)
                    neighbors[kid].update(parents)

                    # Add children
                    children = fetch_children(kid, limit=50)
                    for child in children:
                        all_kitties[child["id"]] = child
                        neighbors[kid].add(child["id"])

                    if children:
                        log.info(f"  Kitty {kid}: {len(parents)} parents, {len(children)} children")

                # Check for meeting points and queue unvisited neighbors
                for nid in neighbors[kid]:
                    if nid in backward_visited:
                        # Found a meeting point!
                        total = forward_visited[kid] + 1 + backward_visited[nid]
                        if total <= best_total_depth:
                            best_total_depth = total
                            meeting_points.append((kid, nid))
                            log.info(f"Meeting point found: {kid} <-> {nid} (total depth {total})")

                    if nid not in forward_visited:
                        forward_visited[nid] = current_depth
                        forward_parent[nid] = kid
                        forward_queue.append(nid)

        # Expand backward (from to_ids)
        if backward_queue:
            frontier_ids = []
            while backward_queue and backward_visited.get(backward_queue[0], 0) < current_depth:
                frontier_ids.append(backward_queue.popleft())

            if frontier_ids:
                log.info(f"Backward depth {current_depth}: expanding {len(frontier_ids)} kitties")

            for kid in frontier_ids:
                if kid not in all_kitties:
                    fetched = fetch_kitty(kid)
                    if fetched:
                        all_kitties[kid] = fetched

                kitty = all_kitties.get(kid)
                if not kitty:
                    continue

                if kid not in neighbors:
                    neighbors[kid] = set()

                    parents = get_parents(kitty)
                    neighbors[kid].update(parents)

                    children = fetch_children(kid, limit=50)
                    for child in children:
                        all_kitties[child["id"]] = child
                        neighbors[kid].add(child["id"])

                    if children:
                        log.info(f"  Kitty {kid}: {len(parents)} parents, {len(children)} children")

                for nid in neighbors[kid]:
                    if nid in forward_visited:
                        total = backward_visited[kid] + 1 + forward_visited[nid]
                        if total <= best_total_depth:
                            best_total_depth = total
                            meeting_points.append((nid, kid))
                            log.info(f"Meeting point found: {nid} <-> {kid} (total depth {total})")

                    if nid not in backward_visited:
                        backward_visited[nid] = current_depth
                        backward_parent[nid] = kid
                        backward_queue.append(nid)

        # If we found meeting points and current depth exceeds best path, stop
        if meeting_points and current_depth * 2 > best_total_depth + 2:
            break

    if not meeting_points:
        log.warning(f"No connection found within {max_depth} generations")
        return [], all_kitties

    # Reconstruct paths
    paths = []
    seen_paths = set()

    for from_node, to_node in meeting_points:
        # Reconstruct path from from_ids to from_node
        forward_path = []
        node = from_node
        while node is not None:
            forward_path.append(node)
            node = forward_parent.get(node)
        forward_path.reverse()

        # Reconstruct path from to_node to to_ids
        backward_path = []
        node = to_node
        while node is not None:
            backward_path.append(node)
            node = backward_parent.get(node)

        # Combine paths
        full_path = forward_path + backward_path
        path_tuple = tuple(full_path)

        if path_tuple not in seen_paths:
            seen_paths.add(path_tuple)
            paths.append(full_path)

    # Sort by length
    paths.sort(key=len)

    return paths, all_kitties


def main():
    parser = argparse.ArgumentParser(
        description="Find shortest path between two groups of CryptoKitties"
    )
    parser.add_argument("--from-ids", help="Comma-separated kitty IDs for group A")
    parser.add_argument("--from-json", help="JSON file containing group A kitties")
    parser.add_argument("--to-ids", help="Comma-separated kitty IDs for group B")
    parser.add_argument("--to-json", help="JSON file containing group B kitties")
    parser.add_argument("--max-depth", type=int, default=50, help="Max generations to search (default: 50)")
    parser.add_argument("--out", help="Output JSON file with connected graph")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")

    args = parser.parse_args()

    if args.verbose:
        log.setLevel(logging.INFO)
    else:
        log.setLevel(logging.WARNING)

    # Parse group A
    from_ids: Set[int] = set()
    from_kitties: Dict[int, Dict[str, Any]] = {}

    if args.from_ids:
        from_ids = {int(x.strip()) for x in args.from_ids.split(",")}
    if args.from_json:
        from_kitties = load_kitties_from_json(args.from_json)
        from_ids.update(from_kitties.keys())

    if not from_ids:
        print("Error: Must specify --from-ids or --from-json", file=sys.stderr)
        sys.exit(1)

    # Parse group B
    to_ids: Set[int] = set()
    to_kitties: Dict[int, Dict[str, Any]] = {}

    if args.to_ids:
        to_ids = {int(x.strip()) for x in args.to_ids.split(",")}
    if args.to_json:
        to_kitties = load_kitties_from_json(args.to_json)
        to_ids.update(to_kitties.keys())

    if not to_ids:
        print("Error: Must specify --to-ids or --to-json", file=sys.stderr)
        sys.exit(1)

    print(f"Finding shortest path between {len(from_ids)} and {len(to_ids)} kitties...")
    print(f"From: {sorted(from_ids)[:10]}{'...' if len(from_ids) > 10 else ''}")
    print(f"To: {sorted(to_ids)[:10]}{'...' if len(to_ids) > 10 else ''}")
    print()

    paths, fetched_kitties = find_shortest_paths(
        from_ids, to_ids,
        max_depth=args.max_depth,
        verbose=args.verbose
    )

    if not paths:
        print("No connection found!")
        sys.exit(1)

    print(f"\nFound {len(paths)} shortest path(s):")
    for i, path in enumerate(paths[:5], 1):  # Show max 5 paths
        print(f"  Path {i} ({len(path)} kitties): {' -> '.join(str(k) for k in path)}")
    if len(paths) > 5:
        print(f"  ... and {len(paths) - 5} more paths")

    # Export if requested
    if args.out:
        # Combine all kitties: from_kitties + to_kitties + fetched + path kitties
        all_kitties = {}
        all_kitties.update(from_kitties)
        all_kitties.update(to_kitties)
        all_kitties.update(fetched_kitties)

        # Fetch any missing path kitties
        path_ids = set()
        for path in paths:
            path_ids.update(path)

        missing = [kid for kid in path_ids if kid not in all_kitties]
        if missing:
            log.info(f"Fetching {len(missing)} missing path kitties")
            fetched = fetch_kitties_batch(missing)
            all_kitties.update(fetched)

        # Build output
        output = {
            "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "from_ids": sorted(from_ids),
            "to_ids": sorted(to_ids),
            "paths": paths,
            "kitties": list(all_kitties.values())
        }

        with open(args.out, "w") as f:
            json.dump(output, f, indent=2)

        print(f"\nExported {len(all_kitties)} kitties to {args.out}")


if __name__ == "__main__":
    main()
