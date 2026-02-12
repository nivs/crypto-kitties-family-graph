#!/usr/bin/env python3
"""
Find CryptoKitties with rare traits (Tier II, III, IIII mewtations).

Searches the CK API for kitties with specific rare cattributes.

Usage:
    python3 find_rare_traits.py --trait liger --limit 10
    python3 find_rare_traits.py --tier IIII --limit 5
    python3 find_rare_traits.py --tier III --limit 20
    python3 find_rare_traits.py --diamonds --limit 10

Save IDs for use with ck_fetch.py:
    python3 find_rare_traits.py --tier IIII --limit 10 --ids-file tier_iiii_ids.txt
    python3 ck_fetch.py --ids-file tier_iiii_ids.txt --parents 3 --out ../dist/example/tier_iiii/tier_iiii.json
"""

import argparse
import json
import time
import requests
from typing import List, Dict, Optional

API_BASE = "https://api.cryptokitties.co/v3"
USER_AGENT = "ck-rare-trait-finder/1.0"

# Tier IIII traits (Kai 'w' = index 30) - rarest
TIER_IIII_TRAITS = {
    'body': 'liger',
    'pattern': 'moonrise',
    'eyecolor': 'kaleidoscope',
    'eyeshape': 'drama',
    'basecolor': 'firstblush',
    'highlight': 'jalapenored',  # Note: some sources show 'ooze' for x
    'accent': 'dreamboat',
    'wild': 'dune',
    'mouth': 'delite',
    'environment': 'junglebook',
    # secret and purrstige don't have known IIII traits
}

# Tier III traits (Kai 'u','v' = index 28-29)
TIER_III_TRAITS = {
    'body': ['lykoi', 'burmilla'],
    'pattern': ['avatar', 'gyre'],
    'eyecolor': ['gemini', 'dioscuri'],
    'eyeshape': ['bornwithit', 'candyshoppe'],
    'basecolor': ['hotcocoa', 'shamrock'],
    'highlight': ['pearl', 'prairierose'],
    'accent': ['sully', 'fallspice'],
    'wild': ['kylin', 'bumblecat'],
    'mouth': ['walrus', 'struck'],
    'environment': ['floorislava', 'prism'],
}

# Tier II traits (Kai 'q'-'t' = index 24-27)
TIER_II_TRAITS = {
    'body': ['fox', 'kurilian', 'toyger', 'manx'],
    'pattern': ['scorpius', 'razzledazzle', 'hotrod', 'allyouneed'],
    'eyecolor': ['babypuke', 'downbythebay', 'autumnmoon', 'oasis'],
    'eyeshape': ['oceanid', 'wingtips', 'firedup', 'buzzed'],
    'basecolor': ['icicle', 'onyx', 'hyacinth', 'martian'],
    'highlight': ['universe', 'royalblue', 'mertail', 'inflatablepool'],
    'accent': ['seafoam', 'cobalt', 'mallowflower', 'mintmacaron'],
    'wild': ['dragonwings', 'alicorn', 'wyrm', 'mantis'],
    'mouth': ['yokel', 'topoftheworld', 'neckbeard', 'satiated'],
    'environment': ['secretgarden', 'frozen', 'roadtogold', 'jacked'],
}


def search_by_cattribute(trait_value: str, limit: int = 10, offset: int = 0) -> List[Dict]:
    """Search for kitties with a specific cattribute."""
    url = f"{API_BASE}/kitties"
    params = {
        'search': trait_value,
        'limit': limit,
        'offset': offset,
        'orderBy': 'id',
        'orderDirection': 'asc',
    }
    headers = {'User-Agent': USER_AGENT}

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get('kitties', [])
    except Exception as e:
        print(f"  Error searching for '{trait_value}': {e}")
        return []


def get_kitty_details(kitty_id: int) -> Optional[Dict]:
    """Get full details for a kitty including enhanced_cattributes."""
    url = f"{API_BASE}/kitties/{kitty_id}"
    headers = {'User-Agent': USER_AGENT}

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  Error fetching kitty {kitty_id}: {e}")
        return None


def find_diamonds(limit: int = 10) -> List[Dict]:
    """Find kitties with diamond mewtation gems (first discoverers)."""
    # Diamond gems are position=1 in enhanced_cattributes
    # We need to search for rare traits and check their discovery position

    results = []

    # Search through IIII traits first (most likely to have diamond gems)
    for category, trait in TIER_IIII_TRAITS.items():
        if not trait:
            continue
        print(f"  Searching {category}: {trait}...")
        kitties = search_by_cattribute(trait, limit=5)

        for k in kitties:
            kid = k.get('id')
            if not kid:
                continue

            # Get full details to check enhanced_cattributes
            details = get_kitty_details(kid)
            if not details:
                continue

            enhanced = details.get('enhanced_cattributes', [])
            for attr in enhanced:
                if attr.get('kittyId') == kid and attr.get('position') == 1:
                    results.append({
                        'id': kid,
                        'name': k.get('name'),
                        'generation': k.get('generation'),
                        'trait_type': attr.get('type'),
                        'trait_value': attr.get('description'),
                        'gem': 'diamond',
                    })
                    print(f"    Found diamond: #{kid} - {attr.get('description')}")

            time.sleep(0.2)

        if len(results) >= limit:
            break
        time.sleep(0.3)

    return results[:limit]


def find_by_tier(tier: str, limit: int = 10) -> List[Dict]:
    """Find kitties with traits of a specific tier."""
    if tier == 'IIII':
        traits_dict = {k: [v] if v else [] for k, v in TIER_IIII_TRAITS.items()}
    elif tier == 'III':
        traits_dict = TIER_III_TRAITS
    elif tier == 'II':
        traits_dict = TIER_II_TRAITS
    else:
        print(f"Unknown tier: {tier}")
        return []

    results = []
    seen_ids = set()

    for category, traits in traits_dict.items():
        if not traits:
            continue

        for trait in (traits if isinstance(traits, list) else [traits]):
            if len(results) >= limit:
                break

            print(f"  Searching {category}: {trait}...")
            kitties = search_by_cattribute(trait, limit=min(5, limit - len(results)))

            for k in kitties:
                kid = k.get('id')
                if kid and kid not in seen_ids:
                    seen_ids.add(kid)
                    results.append({
                        'id': kid,
                        'name': k.get('name'),
                        'generation': k.get('generation'),
                        'category': category,
                        'trait': trait,
                        'tier': tier,
                    })
                    print(f"    #{kid} {k.get('name') or 'unnamed'} (Gen {k.get('generation')})")

            time.sleep(0.3)

        if len(results) >= limit:
            break

    return results[:limit]


def find_by_trait(trait_value: str, limit: int = 10) -> List[Dict]:
    """Find kitties with a specific trait value."""
    print(f"Searching for trait: {trait_value}...")
    kitties = search_by_cattribute(trait_value, limit=limit)

    results = []
    for k in kitties:
        results.append({
            'id': k.get('id'),
            'name': k.get('name'),
            'generation': k.get('generation'),
            'trait': trait_value,
        })
        print(f"  #{k.get('id')} {k.get('name') or 'unnamed'} (Gen {k.get('generation')})")

    return results


def main():
    parser = argparse.ArgumentParser(description="Find CryptoKitties with rare traits")
    parser.add_argument('--trait', type=str, help='Search for specific trait value')
    parser.add_argument('--tier', type=str, choices=['II', 'III', 'IIII'], help='Find kitties with traits of this tier')
    parser.add_argument('--diamonds', action='store_true', help='Find kitties with diamond mewtation gems')
    parser.add_argument('--limit', type=int, default=10, help='Max results (default: 10)')
    parser.add_argument('--output', '-o', type=str, help='Save results to JSON file')
    parser.add_argument('--ids-file', type=str, help='Save IDs to file (for use with ck_fetch.py --ids-file)')
    parser.add_argument('--ids-only', action='store_true', help='Output only comma-separated IDs')

    args = parser.parse_args()

    results = []

    if args.trait:
        results = find_by_trait(args.trait, args.limit)
    elif args.tier:
        print(f"Finding Tier {args.tier} kitties...")
        results = find_by_tier(args.tier, args.limit)
    elif args.diamonds:
        print("Finding diamond gem kitties (first discoverers)...")
        results = find_diamonds(args.limit)
    else:
        parser.print_help()
        return 1

    print(f"\nFound {len(results)} kitties")

    if args.ids_only:
        ids = [str(r['id']) for r in results]
        print(','.join(ids))

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Saved to {args.output}")

    if args.ids_file:
        ids = [str(r['id']) for r in results]
        with open(args.ids_file, 'w') as f:
            f.write('\n'.join(ids))
        print(f"Saved {len(ids)} IDs to {args.ids_file}")
        print(f"  Use with: python3 ck_fetch.py --ids-file {args.ids_file} --parents 3 --out output.json")

    return 0


if __name__ == '__main__':
    exit(main())
