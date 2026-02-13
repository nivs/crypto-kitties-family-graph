#!/usr/bin/env python3
"""
CryptoKitties Fancy Cat Detector

Detects fancy cats in a JSON file based on trait combinations.

Fancy cats are special kitties that appear when specific trait combinations
are bred together. Some fancies have time-limited windows.

Usage:
    python3 fancy_detector.py kitties.json
    python3 fancy_detector.py kitties.json --verbose
    python3 fancy_detector.py kitties.json --check-potential

Examples:
    python3 fancy_detector.py ../dist/examples/founders/founders.json
    python3 fancy_detector.py ../dist/examples/nivs/nivs_full_parents.json --verbose
"""

import argparse
import json
from typing import Dict, List, Set, Tuple, Optional, Any
from collections import defaultdict

# Import trait data
try:
    from ck_traits import (
        FANCY_RECIPES, check_fancy_recipe, get_trait_name,
        TRAIT_CATEGORIES, TRAIT_NAMES, KAI
    )
    HAS_TRAIT_DATA = True
except ImportError:
    HAS_TRAIT_DATA = False
    print("Warning: ck_traits.py not found. Limited functionality available.")
    FANCY_RECIPES = {}

    def check_fancy_recipe(traits):
        return []


def load_kitties(json_path: str) -> Tuple[Dict[int, Dict], List[int]]:
    """Load kitties from JSON file, return (kitties_by_id, root_ids)."""
    with open(json_path, 'r') as f:
        data = json.load(f)

    kitties = {}
    for k in data.get('kitties', []):
        kid = k.get('id')
        if kid:
            kitties[int(kid)] = k

    root_ids = [int(r) for r in data.get('root_ids', [])]
    return kitties, root_ids


def get_kitty_traits(kitty: Dict) -> Dict[str, str]:
    """Extract trait values from a kitty."""
    traits = {}

    # Try traits dict first
    if 'traits' in kitty and kitty['traits']:
        for trait_type, trait_value in kitty['traits'].items():
            # Normalize key names
            normalized_key = trait_type.lower()
            if normalized_key == 'coloreyes':
                normalized_key = 'eyecolor'
            elif normalized_key == 'colorprimary':
                normalized_key = 'basecolor'
            elif normalized_key == 'colorsecondary':
                normalized_key = 'highlight'
            elif normalized_key == 'colortertiary':
                normalized_key = 'accent'
            elif normalized_key == 'eyes':
                normalized_key = 'eyeshape'
            traits[normalized_key] = trait_value

    # Also check enhanced_cattributes
    enhanced = kitty.get('enhanced_cattributes', [])
    for attr in enhanced:
        if attr.get('type') and attr.get('description'):
            traits[attr['type'].lower()] = attr['description']

    return traits


def check_is_fancy(kitty: Dict) -> Tuple[bool, Optional[str]]:
    """Check if a kitty is marked as fancy in API data."""
    raw = kitty.get('raw', kitty)

    is_fancy = raw.get('is_fancy', False)
    fancy_type = raw.get('fancy_type')

    if is_fancy and fancy_type:
        return True, fancy_type

    return False, None


def check_is_exclusive(kitty: Dict) -> Tuple[bool, Optional[str]]:
    """Check if a kitty is an exclusive."""
    raw = kitty.get('raw', kitty)

    is_exclusive = raw.get('is_exclusive', False)
    kitty_type = raw.get('kitty_type')

    if is_exclusive or kitty_type == 'exclusive':
        name = kitty.get('name', f"Kitty #{kitty.get('id')}")
        return True, name

    return False, None


def check_is_special_edition(kitty: Dict) -> bool:
    """Check if a kitty is a special edition."""
    raw = kitty.get('raw', kitty)
    return raw.get('is_special_edition', False)


def analyze_collection(kitties: Dict[int, Dict], verbose: bool = False) -> Dict[str, Any]:
    """Analyze a collection for fancy cats and potential fancies."""
    results = {
        'fancies': [],
        'exclusives': [],
        'special_editions': [],
        'potential_fancies': [],
        'recipe_matches': defaultdict(list),
    }

    for kid, k in kitties.items():
        # Check API-marked fancies
        is_fancy, fancy_type = check_is_fancy(k)
        if is_fancy:
            results['fancies'].append({
                'id': kid,
                'name': k.get('name'),
                'fancy_type': fancy_type,
                'generation': k.get('generation'),
            })

        # Check exclusives
        is_exclusive, excl_name = check_is_exclusive(k)
        if is_exclusive:
            results['exclusives'].append({
                'id': kid,
                'name': k.get('name'),
                'type': excl_name,
                'generation': k.get('generation'),
            })

        # Check special editions
        if check_is_special_edition(k):
            results['special_editions'].append({
                'id': kid,
                'name': k.get('name'),
                'generation': k.get('generation'),
            })

        # Check trait-based fancy recipes
        if HAS_TRAIT_DATA:
            traits = get_kitty_traits(k)
            matched_recipes = check_fancy_recipe(traits)

            for recipe in matched_recipes:
                results['recipe_matches'][recipe].append({
                    'id': kid,
                    'name': k.get('name'),
                    'generation': k.get('generation'),
                })

    return results


def check_potential_fancies(kitties: Dict[int, Dict]) -> List[Dict]:
    """
    Check for kitties that are close to matching a fancy recipe.
    Returns kitties that match all but 1-2 traits of a recipe.
    """
    if not HAS_TRAIT_DATA:
        return []

    potential = []

    for kid, k in kitties.items():
        traits = get_kitty_traits(k)
        traits_lower = {key.lower(): val.lower() if val else None for key, val in traits.items()}

        for fancy_name, recipe in FANCY_RECIPES.items():
            matches = 0
            missing = []
            total = len(recipe)

            for category, required_trait in recipe.items():
                actual = traits_lower.get(category.lower())
                if actual == required_trait.lower():
                    matches += 1
                else:
                    missing.append((category, required_trait, actual))

            # If missing only 1-2 traits, it's a "potential" fancy
            if 0 < len(missing) <= 2 and matches >= 2:
                potential.append({
                    'id': kid,
                    'name': k.get('name'),
                    'generation': k.get('generation'),
                    'fancy': fancy_name,
                    'matches': matches,
                    'total': total,
                    'missing': missing,
                })

    # Sort by closest to complete
    potential.sort(key=lambda x: (x['total'] - x['matches'], x['fancy']))

    return potential


def print_report(results: Dict[str, Any], verbose: bool = False):
    """Print the fancy cat analysis report."""
    print("\n=== FANCY CAT ANALYSIS ===\n")

    # Exclusives (rarest)
    if results['exclusives']:
        print(f"EXCLUSIVE CATS ({len(results['exclusives'])}):")
        print("-" * 50)
        for e in sorted(results['exclusives'], key=lambda x: x['id']):
            print(f"  #{e['id']:>7}  {e['name'] or 'unnamed':<25} Gen {e.get('generation', '?')}")
        print()

    # Fancies
    if results['fancies']:
        print(f"FANCY CATS ({len(results['fancies'])}):")
        print("-" * 50)
        for f in sorted(results['fancies'], key=lambda x: x['id']):
            print(f"  #{f['id']:>7}  {f['name'] or 'unnamed':<25} {f['fancy_type']:<15} Gen {f.get('generation', '?')}")
        print()

    # Special editions
    if results['special_editions']:
        print(f"SPECIAL EDITION CATS ({len(results['special_editions'])}):")
        print("-" * 50)
        for s in sorted(results['special_editions'], key=lambda x: x['id']):
            print(f"  #{s['id']:>7}  {s['name'] or 'unnamed':<25} Gen {s.get('generation', '?')}")
        print()

    # Recipe matches
    if results['recipe_matches']:
        print(f"RECIPE MATCHES:")
        print("-" * 50)
        for recipe, matches in sorted(results['recipe_matches'].items()):
            print(f"  {recipe}: {len(matches)} kitties")
            if verbose:
                for m in matches[:5]:
                    print(f"    #{m['id']} {m['name'] or 'unnamed'}")
        print()

    # Summary
    total_special = len(results['exclusives']) + len(results['fancies']) + len(results['special_editions'])
    if total_special == 0:
        print("No fancy, exclusive, or special edition cats found in this collection.")
    else:
        print(f"SUMMARY: {len(results['exclusives'])} exclusives, {len(results['fancies'])} fancies, {len(results['special_editions'])} special editions")


def print_potential_report(potential: List[Dict]):
    """Print potential fancy matches."""
    if not potential:
        print("\nNo potential fancy matches found.")
        return

    print(f"\n=== POTENTIAL FANCY MATCHES ({len(potential)}) ===\n")
    print("Kitties that are close to matching a fancy recipe:\n")

    for p in potential[:20]:  # Limit output
        missing_str = ", ".join(f"{cat}={req} (has: {act or 'none'})" for cat, req, act in p['missing'])
        print(f"  #{p['id']:>7}  {p['name'] or 'unnamed':<20} → {p['fancy']}")
        print(f"           Matches {p['matches']}/{p['total']} traits. Missing: {missing_str}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="CryptoKitties fancy cat detector",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('json_file', help='JSON file with kitty data')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed output')
    parser.add_argument('--check-potential', action='store_true', help='Check for near-fancy matches')

    args = parser.parse_args()

    # Load data
    kitties, root_ids = load_kitties(args.json_file)
    print(f"Loaded {len(kitties)} kitties from {args.json_file}")

    # Analyze
    results = analyze_collection(kitties, args.verbose)
    print_report(results, args.verbose)

    # Check potential matches
    if args.check_potential:
        potential = check_potential_fancies(kitties)
        print_potential_report(potential)

    return 0


if __name__ == '__main__':
    exit(main())
