#!/usr/bin/env python3
"""
Filter a kitty JSON dataset to only include kitties connected to the root(s).

Removes disconnected nodes that can't be reached via parent/child edges from
any root kitty. Useful for creating datasets suitable for shortest-path demos.

Usage:
    python3 filter_connected.py input.json -o output.json
    python3 filter_connected.py input.json --root 896775 -o output.json
"""

import argparse
import json
import sys
from collections import deque


def build_adjacency(kitties_list, kitty_map):
    """Build undirected adjacency map from parent relationships."""
    adj = {}
    for k in kitties_list:
        kid = k['id']
        if kid not in adj:
            adj[kid] = set()
        for parent_id in [k.get('matron_id'), k.get('sire_id')]:
            if parent_id and parent_id in kitty_map:
                if parent_id not in adj:
                    adj[parent_id] = set()
                adj[kid].add(parent_id)
                adj[parent_id].add(kid)
    return adj


def find_connected(adj, roots, kitty_map):
    """BFS from roots to find all connected kitty IDs."""
    connected = set()
    queue = deque()

    for r in roots:
        if r in kitty_map:
            connected.add(r)
            queue.append(r)

    while queue:
        curr = queue.popleft()
        for neighbor in adj.get(curr, []):
            if neighbor not in connected:
                connected.add(neighbor)
                queue.append(neighbor)

    return connected


def main():
    parser = argparse.ArgumentParser(
        description='Filter kitty dataset to only connected nodes.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Filter using root_ids from the JSON file
    python3 filter_connected.py ../dist/example/dragon/dragon_extended.json \\
        -o ../dist/example/dragon/dragon_connected.json

    # Filter using a specific root
    python3 filter_connected.py data.json --root 896775 -o connected.json

    # Filter using multiple roots
    python3 filter_connected.py data.json --root 896775 --root 123456 -o connected.json
        """
    )
    parser.add_argument('input', help='Input JSON file')
    parser.add_argument('-o', '--out', required=True, help='Output JSON file')
    parser.add_argument('--root', type=int, action='append', dest='roots',
                        help='Root kitty ID(s) to trace from (default: use root_ids from file)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')

    args = parser.parse_args()

    # Load input
    with open(args.input) as f:
        data = json.load(f)

    kitties_list = data.get('kitties', [])
    kitty_map = {k['id']: k for k in kitties_list}

    # Determine roots
    roots = args.roots if args.roots else data.get('root_ids', [])
    if not roots:
        print("Error: No roots specified and no root_ids in file", file=sys.stderr)
        sys.exit(1)

    # Build adjacency and find connected
    adj = build_adjacency(kitties_list, kitty_map)
    connected_ids = find_connected(adj, roots, kitty_map)

    # Filter kitties
    filtered_kitties = [k for k in kitties_list if k['id'] in connected_ids]
    disconnected_count = len(kitties_list) - len(filtered_kitties)

    if args.verbose:
        print(f"Input: {len(kitties_list)} kitties, roots: {roots}")
        print(f"Connected: {len(filtered_kitties)}, Removed: {disconnected_count}")

    if disconnected_count == 0:
        print(f"All {len(kitties_list)} kitties are connected, no filtering needed.")
        # Still write output for consistency

    # Build output
    output = {
        'source': data.get('source'),
        'generated_at_utc': data.get('generated_at_utc'),
        'config': data.get('config'),
        'root_ids': roots,
        'filtered_from': args.input,
        'filter_note': f'Filtered to {len(filtered_kitties)} kitties connected to roots (removed {disconnected_count})',
        'kitties': filtered_kitties
    }

    # Write output
    with open(args.out, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(filtered_kitties)} kitties to {args.out}")


if __name__ == '__main__':
    main()
