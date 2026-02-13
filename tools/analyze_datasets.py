#!/usr/bin/env python3
"""
Analyze CryptoKitties dataset JSON files to understand data ranges
and recommend optimal Z-axis settings for 3D visualization.

Usage:
    python3 analyze_datasets.py [directory]

Default directory: current directory
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

def analyze_dataset(filepath):
    """Analyze a single dataset JSON file."""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)

        kitties = data.get('kitties', [])
        if not kitties:
            return None

        # Extract generation values
        generations = [k.get('generation') for k in kitties if k.get('generation') is not None]

        # Extract dates
        dates = []
        for k in kitties:
            date = k.get('birthday') or k.get('created_at')
            if date:
                dates.append(date)

        # Count mewtation gems and their positions
        gem_positions = []
        gem_types = defaultdict(int)
        for k in kitties:
            enhanced = k.get('enhanced_cattributes', [])
            for attr in enhanced:
                pos = attr.get('position')
                if pos and pos > 0 and pos <= 500:
                    gem_positions.append(pos)
                    # Determine gem type
                    if pos == 1:
                        gem_types['diamond'] += 1
                    elif pos <= 10:
                        gem_types['gold'] += 1
                    elif pos <= 100:
                        gem_types['silver'] += 1
                    else:
                        gem_types['bronze'] += 1

        result = {
            'filepath': str(filepath),
            'kitty_count': len(kitties),
            'generation': {
                'values': generations,
                'min': min(generations) if generations else None,
                'max': max(generations) if generations else None,
                'range': max(generations) - min(generations) + 1 if generations else 0,
                'unique': len(set(generations)) if generations else 0
            },
            'dates': {
                'count': len(dates),
                'unique': len(set(dates))
            },
            'mewtations': {
                'total': len(gem_positions),
                'positions': {
                    'min': min(gem_positions) if gem_positions else None,
                    'max': max(gem_positions) if gem_positions else None
                },
                'by_type': dict(gem_types)
            }
        }

        return result

    except Exception as e:
        print(f"Error analyzing {filepath}: {e}", file=sys.stderr)
        return None

def recommend_zaxis(analysis):
    """
    Recommend best Z-axis mode and parameters based on dataset characteristics.

    Returns: (mode, reason, parameters)
    """
    gen_range = analysis['generation']['range']
    gen_unique = analysis['generation']['unique']
    mewtation_count = analysis['mewtations']['total']
    kitty_count = analysis['kitty_count']

    # Default parameters
    params = {
        'maxZSpread': 800,  # Default max Z range
        'description': ''
    }

    # Adjust maxZSpread based on dataset size
    if kitty_count > 500:
        params['maxZSpread'] = 1000
        params['description'] = 'Large dataset - increased Z spread'
    elif kitty_count < 50:
        params['maxZSpread'] = 600
        params['description'] = 'Small dataset - reduced Z spread'

    # If very large generation range (>100), probably not a family tree
    if gen_range > 100:
        if mewtation_count > 0:
            return 'rarity', 'Wide generation range with mewtations - use rarity', params
        else:
            return 'birthday', 'Wide generation range - use birthday for spread', params

    # If tight generation range (<20), probably a specific subset
    if gen_range < 20:
        if mewtation_count > kitty_count * 0.3:  # >30% have mewtations
            return 'rarity', 'Tight generation range with many mewtations', params
        else:
            params['maxZSpread'] = 600  # Tighter spread for small range
            return 'birthday', 'Tight generation range - birthday provides better spread', params

    # Medium range (20-100) - generation works well
    if gen_unique > gen_range * 0.5:  # Good distribution
        return 'generation', 'Good generation distribution for family tree', params

    return 'generation', 'Default: generation for family tree structure', params

def format_url_params(mode, params):
    """Format URL parameters for the viewer."""
    url_params = f"zAxis={mode}"
    # Could add more parameters here if needed
    return url_params

def main():
    # Determine directory to scan
    if len(sys.argv) > 1:
        directory = Path(sys.argv[1])
    else:
        directory = Path('.')

    if not directory.is_dir():
        print(f"Error: {directory} is not a directory", file=sys.stderr)
        sys.exit(1)

    # Find all JSON files
    json_files = sorted(directory.rglob('*.json'))

    if not json_files:
        print(f"No JSON files found in {directory}")
        sys.exit(0)

    print("=" * 80)
    print("CryptoKitties Dataset Analysis & Z-Axis Recommendations")
    print("=" * 80)
    print()

    recommendations = {}

    for json_file in json_files:
        result = analyze_dataset(json_file)
        if not result:
            continue

        rel_path = json_file.relative_to(directory)
        print(f"📁 {rel_path}")
        print(f"   Kitties: {result['kitty_count']}")

        gen = result['generation']
        if gen['min'] is not None:
            print(f"   Generation: {gen['min']}-{gen['max']} (range: {gen['range']}, unique: {gen['unique']})")

        dates = result['dates']
        print(f"   Dates: {dates['unique']} unique dates")

        mut = result['mewtations']
        if mut['total'] > 0:
            print(f"   Mewtations: {mut['total']} gems (pos: {mut['positions']['min']}-{mut['positions']['max']})")
            if mut['by_type']:
                types_str = ', '.join(f"{k}:{v}" for k, v in mut['by_type'].items())
                print(f"              {types_str}")

        recommended_mode, reason, params = recommend_zaxis(result)
        print(f"   ✨ Recommended Z-axis: {recommended_mode}")
        print(f"      Reason: {reason}")
        print(f"      Parameters: maxZSpread={params['maxZSpread']}")
        if params['description']:
            print(f"      Note: {params['description']}")

        url_params = format_url_params(recommended_mode, params)
        print(f"      URL param: ?{url_params}")

        recommendations[str(rel_path)] = {
            'mode': recommended_mode,
            'params': params,
            'url': url_params
        }
        print()

    print("=" * 80)
    print("Z-axis Mode Guide:")
    print("  • generation: Best for family trees with <100 generation range")
    print("  • birthday: Best for time-based analysis or tight generation ranges")
    print("  • rarity: Best for mewtation-focused datasets (tier III/IIII, diamonds)")
    print("  • flat: All nodes at same Z (useful for 2D-like layout)")
    print()
    print("Parameters:")
    print("  • maxZSpread: Maximum Z-axis range (600-1000)")
    print("    - Automatically normalized based on actual data range")
    print("    - Prevents excessive spread for datasets with outliers")
    print("=" * 80)
    print()
    print("Summary of Recommendations by Z-Axis Mode:")
    print()

    by_mode = defaultdict(list)
    for path, rec in recommendations.items():
        by_mode[rec['mode']].append(path)

    for mode in ['generation', 'birthday', 'rarity', 'flat']:
        if mode in by_mode:
            print(f"{mode}: {len(by_mode[mode])} datasets")
            for path in sorted(by_mode[mode]):
                print(f"  - {path}")
            print()

if __name__ == '__main__':
    main()
