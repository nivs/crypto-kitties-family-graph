#!/usr/bin/env python3
"""
Prune kitties JSON to only keep direct ancestor paths to Gen 0 founders.

Modes:
  --all       Keep ALL ancestor paths (both matron and sire lines) [default]
  --shortest  Keep only the SHORTEST path to Gen 0 (follows lower-gen parent)
  --matron    Keep only the matron line
  --sire      Keep only the sire line

Usage:
    python3 prune_to_ancestors.py input.json -o output.json
    python3 prune_to_ancestors.py input.json --shortest -o output.json
    python3 prune_to_ancestors.py input.json --dry-run  # Show stats without writing
"""

import argparse
import json
from typing import Dict, Set, List


def load_kitties(json_path: str) -> tuple:
    """Load kitties from JSON file."""
    with open(json_path, 'r') as f:
        data = json.load(f)

    kitties = {}
    for k in data.get('kitties', []):
        kid = k.get('id')
        if kid:
            kitties[int(kid)] = k

    root_ids = [int(r) for r in data.get('root_ids', [])]
    config = data.get('config', {})

    return kitties, root_ids, config, data


def find_all_ancestors(kitty_id: int, kitties: Dict[int, dict], ancestors: Set[int]) -> None:
    """Recursively find ALL ancestors of a kitty (both matron and sire lines)."""
    if kitty_id in ancestors:
        return  # Already processed

    if kitty_id not in kitties:
        return  # Kitty not in dataset

    ancestors.add(kitty_id)

    k = kitties[kitty_id]
    matron_id = k.get('matron_id')
    sire_id = k.get('sire_id')

    if matron_id:
        find_all_ancestors(int(matron_id), kitties, ancestors)
    if sire_id:
        find_all_ancestors(int(sire_id), kitties, ancestors)


def find_shortest_path(kitty_id: int, kitties: Dict[int, dict], ancestors: Set[int]) -> None:
    """Find shortest path to Gen 0 by always following the lower-generation parent."""
    if kitty_id in ancestors:
        return  # Already processed

    if kitty_id not in kitties:
        return  # Kitty not in dataset

    ancestors.add(kitty_id)

    k = kitties[kitty_id]
    gen = k.get('generation', 0)

    if gen == 0:
        return  # Reached founder

    matron_id = k.get('matron_id')
    sire_id = k.get('sire_id')

    # Get parent generations
    matron_gen = kitties.get(int(matron_id), {}).get('generation', 999) if matron_id else 999
    sire_gen = kitties.get(int(sire_id), {}).get('generation', 999) if sire_id else 999

    # Follow the lower-generation parent (shorter path to Gen 0)
    if matron_gen <= sire_gen and matron_id and int(matron_id) in kitties:
        find_shortest_path(int(matron_id), kitties, ancestors)
    elif sire_id and int(sire_id) in kitties:
        find_shortest_path(int(sire_id), kitties, ancestors)
    elif matron_id and int(matron_id) in kitties:
        find_shortest_path(int(matron_id), kitties, ancestors)


def find_matron_line(kitty_id: int, kitties: Dict[int, dict], ancestors: Set[int]) -> None:
    """Find matron-only lineage to Gen 0."""
    if kitty_id in ancestors:
        return

    if kitty_id not in kitties:
        return

    ancestors.add(kitty_id)

    k = kitties[kitty_id]
    matron_id = k.get('matron_id')

    if matron_id and int(matron_id) in kitties:
        find_matron_line(int(matron_id), kitties, ancestors)


def find_sire_line(kitty_id: int, kitties: Dict[int, dict], ancestors: Set[int]) -> None:
    """Find sire-only lineage to Gen 0."""
    if kitty_id in ancestors:
        return

    if kitty_id not in kitties:
        return

    ancestors.add(kitty_id)

    k = kitties[kitty_id]
    sire_id = k.get('sire_id')

    if sire_id and int(sire_id) in kitties:
        find_sire_line(int(sire_id), kitties, ancestors)


def prune_to_ancestors(kitties: Dict[int, dict], root_ids: List[int], mode: str = 'all') -> Set[int]:
    """Find kitties to keep based on pruning mode."""
    ancestors = set()

    finder = {
        'all': find_all_ancestors,
        'shortest': find_shortest_path,
        'matron': find_matron_line,
        'sire': find_sire_line,
    }.get(mode, find_all_ancestors)

    for root_id in root_ids:
        finder(root_id, kitties, ancestors)

    return ancestors


def main():
    parser = argparse.ArgumentParser(
        description="Prune kitties JSON to only keep direct ancestor paths",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('input_file', help='Input JSON file with kitty data')
    parser.add_argument('-o', '--output', metavar='FILE', help='Output JSON file')
    parser.add_argument('--dry-run', action='store_true', help='Show stats without writing')
    parser.add_argument('--keep-raw', action='store_true', help='Keep raw API data in output')

    # Pruning mode (mutually exclusive)
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument('--all', action='store_const', const='all', dest='mode',
                           help='Keep ALL ancestor paths (default)')
    mode_group.add_argument('--shortest', action='store_const', const='shortest', dest='mode',
                           help='Keep only shortest path to Gen 0')
    mode_group.add_argument('--matron', action='store_const', const='matron', dest='mode',
                           help='Keep only matron line')
    mode_group.add_argument('--sire', action='store_const', const='sire', dest='mode',
                           help='Keep only sire line')
    parser.set_defaults(mode='all')

    args = parser.parse_args()

    # Load data
    kitties, root_ids, config, original_data = load_kitties(args.input_file)
    print(f"Loaded {len(kitties)} kitties from {args.input_file}")
    print(f"Root IDs: {root_ids}")
    print(f"Mode: {args.mode}")

    # Find ancestors
    ancestors = prune_to_ancestors(kitties, root_ids, args.mode)

    # Stats
    removed = set(kitties.keys()) - ancestors
    print(f"\nAncestor kitties to keep: {len(ancestors)}")
    print(f"Non-ancestor kitties to remove: {len(removed)}")
    print(f"Reduction: {len(kitties)} → {len(ancestors)} ({100 - len(ancestors)/len(kitties)*100:.1f}% smaller)")

    # Generation breakdown
    gen_kept = {}
    gen_removed = {}
    for kid in ancestors:
        gen = kitties[kid].get('generation', '?')
        gen_kept[gen] = gen_kept.get(gen, 0) + 1
    for kid in removed:
        gen = kitties[kid].get('generation', '?')
        gen_removed[gen] = gen_removed.get(gen, 0) + 1

    print("\nBy generation:")
    all_gens = sorted(set(gen_kept.keys()) | set(gen_removed.keys()), key=lambda x: x if isinstance(x, int) else 999)
    print(f"{'Gen':>4} {'Kept':>6} {'Removed':>8}")
    print("-" * 20)
    for gen in all_gens:
        kept = gen_kept.get(gen, 0)
        rem = gen_removed.get(gen, 0)
        print(f"{gen:>4} {kept:>6} {rem:>8}")

    # Gen 0 founders in the pruned set
    founders = [kid for kid in ancestors if kitties[kid].get('generation') == 0]
    print(f"\nGen 0 founders in ancestry: {len(founders)}")

    if args.dry_run:
        print("\n[Dry run - no file written]")
        return 0

    if not args.output:
        # Default output name
        args.output = args.input_file.replace('.json', '_ancestors.json')

    # Build output
    pruned_kitties = []
    for kid in sorted(ancestors):
        k = kitties[kid].copy()
        if not args.keep_raw and 'raw' in k:
            del k['raw']
        pruned_kitties.append(k)

    output_data = {
        'kitties': pruned_kitties,
        'root_ids': root_ids,
        'config': config
    }

    # Preserve any other top-level keys from original
    for key in original_data:
        if key not in output_data:
            output_data[key] = original_data[key]

    with open(args.output, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"\nWrote {len(pruned_kitties)} kitties to {args.output}")

    return 0


if __name__ == '__main__':
    exit(main())
