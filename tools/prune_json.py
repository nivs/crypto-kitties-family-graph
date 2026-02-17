#!/usr/bin/env python3
"""
Prune CryptoKitties JSON files to keep only fields used by the visualizer.
Significantly reduces file size while preserving all functionality.
"""

import argparse
import json
import sys
from pathlib import Path

# Fields needed by the visualizer
KITTY_FIELDS = {
    'id',
    'name',
    'generation',
    'matron_id',
    'sire_id',
    'image_url',
    'color',
    'background_color',
    'kitty_color',
    'shadow_color',
    'owner_address',
    'owner_nickname',
    'created_at',
    'birthday',
    'genes',
    'traits',
    'enhanced_cattributes',
    'auction',
    'seller',
}

# Minimal owner fields
OWNER_FIELDS = {'address', 'nickname'}

# Minimal auction fields
AUCTION_FIELDS = {'status', 'type', 'current_price', 'start_price', 'end_price'}

# Minimal seller fields
SELLER_FIELDS = {'address', 'nickname', 'name'}


def prune_owner(owner):
    """Keep only essential owner fields."""
    if not owner or not isinstance(owner, dict):
        return owner
    return {k: v for k, v in owner.items() if k in OWNER_FIELDS}


def prune_auction(auction):
    """Keep only essential auction fields."""
    if not auction or not isinstance(auction, dict):
        return auction
    return {k: v for k, v in auction.items() if k in AUCTION_FIELDS}


def prune_seller(seller):
    """Keep only essential seller fields."""
    if not seller or not isinstance(seller, dict):
        return seller
    return {k: v for k, v in seller.items() if k in SELLER_FIELDS}


def prune_kitty(kitty):
    """Prune a single kitty object to essential fields."""
    pruned = {}

    for key in KITTY_FIELDS:
        if key in kitty:
            value = kitty[key]

            # Special handling for nested objects
            if key == 'owner':
                value = prune_owner(value)
            elif key == 'auction':
                value = prune_auction(value)
            elif key == 'seller':
                value = prune_seller(value)

            # Only include non-null values
            if value is not None:
                pruned[key] = value

    # Extract parent IDs from nested objects if flat fields not present
    if 'matron_id' not in pruned:
        matron = kitty.get('matron')
        if isinstance(matron, dict) and matron.get('id'):
            pruned['matron_id'] = matron['id']
    if 'sire_id' not in pruned:
        sire = kitty.get('sire')
        if isinstance(sire, dict) and sire.get('id'):
            pruned['sire_id'] = sire['id']

    return pruned


def prune_json(data):
    """Prune the entire JSON structure."""
    if 'kitties' not in data:
        return data

    pruned = {
        'kitties': [prune_kitty(k) for k in data['kitties']]
    }

    # Preserve root_ids if present
    if 'root_ids' in data:
        pruned['root_ids'] = data['root_ids']

    # Preserve errors if present
    if 'errors' in data:
        pruned['errors'] = data['errors']

    return pruned


def main():
    parser = argparse.ArgumentParser(
        description='Prune CryptoKitties JSON to essential fields'
    )
    parser.add_argument('input', help='Input JSON file')
    parser.add_argument('-o', '--output', help='Output file (default: overwrite input)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Show size reduction')
    parser.add_argument('--dry-run', action='store_true', help='Show reduction without writing')

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output) if args.output else input_path

    # Read input
    with open(input_path) as f:
        original_size = input_path.stat().st_size
        data = json.load(f)

    # Prune
    pruned = prune_json(data)

    # Serialize
    output_json = json.dumps(pruned, separators=(',', ':'))
    new_size = len(output_json)

    if args.verbose or args.dry_run:
        reduction = (1 - new_size / original_size) * 100
        print(f"{input_path.name}: {original_size:,} -> {new_size:,} bytes ({reduction:.1f}% reduction)")

    if not args.dry_run:
        with open(output_path, 'w') as f:
            f.write(output_json)
        if args.verbose:
            print(f"  Written to: {output_path}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
