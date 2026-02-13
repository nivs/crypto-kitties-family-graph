#!/usr/bin/env python3
"""
Sync tools/examples_config.json with actual JSON files in dist/examples/

Scans dist/examples/**/*.json and:
- Adds new files to config with default metadata (requires manual editing)
- Removes files from config that no longer exist (with --remove-missing flag)

Usage:
    python3 sync_examples_config.py [--remove-missing] [--dry-run]
"""

import json
import argparse
from pathlib import Path
from collections import defaultdict

def scan_examples_dir(examples_dir):
    """Scan dist/examples for all .json files, organized by directory."""
    examples_by_dir = defaultdict(list)

    for json_file in sorted(examples_dir.rglob('*.json')):
        # Skip if file is in svg/ subdirectories or other non-data directories
        if 'svg' in json_file.parts:
            continue

        # Get relative path from examples dir
        rel_path = json_file.relative_to(examples_dir)

        # Directory is the first component (e.g., "dragon", "nivs", etc.)
        if len(rel_path.parts) >= 2:
            directory = rel_path.parts[0]
            filename = rel_path.name
            examples_by_dir[directory].append(filename)

    return examples_by_dir

def find_example_in_config(config, directory, filename):
    """Find an example in config by directory and filename."""
    for section in config['sections']:
        for example in section['examples']:
            if example['directory'] == directory:
                # Check if filename exists in any variation
                for var in example['variations']:
                    if var['file'] == filename:
                        return (section, example, var)
    return None

def add_missing_files(config, examples_by_dir, dry_run=False):
    """Add missing files to config."""
    added = []

    for directory, files in sorted(examples_by_dir.items()):
        for filename in sorted(files):
            # Check if this file exists in config
            found = find_example_in_config(config, directory, filename)
            if not found:
                added.append((directory, filename))
                if not dry_run:
                    # Try to find the directory's example group
                    example_group = None
                    section_target = None
                    for section in config['sections']:
                        for example in section['examples']:
                            if example['directory'] == directory:
                                example_group = example
                                section_target = section
                                break
                        if example_group:
                            break

                    # Add as new variation to existing example group
                    if example_group:
                        example_group['variations'].append({
                            "label": f"View ({filename})",
                            "file": filename
                        })
                        print(f"  → Added variation to existing example: {directory}/{filename}")
                    else:
                        # Create new example in first section (requires manual review)
                        section_target = config['sections'][0]
                        section_target['examples'].append({
                            "name": directory.replace('_', ' ').title(),
                            "description": f"TODO: Add description for {directory}",
                            "directory": directory,
                            "variations": [
                                {
                                    "label": "View",
                                    "file": filename
                                }
                            ]
                        })
                        print(f"  → Created new example: {directory}/{filename} (NEEDS REVIEW)")

    return added

def remove_missing_files(config, examples_by_dir, dry_run=False):
    """Remove files from config that no longer exist."""
    removed = []

    # Build set of all existing files
    existing_files = set()
    for directory, files in examples_by_dir.items():
        for filename in files:
            existing_files.add((directory, filename))

    # Check config for files that don't exist
    sections_to_remove = []
    for section_idx, section in enumerate(config['sections']):
        examples_to_remove = []
        for example_idx, example in enumerate(section['examples']):
            directory = example['directory']
            variations_to_remove = []

            for var_idx, var in enumerate(example['variations']):
                filename = var['file']
                if (directory, filename) not in existing_files:
                    removed.append((directory, filename))
                    variations_to_remove.append(var_idx)

            # Remove variations in reverse order to preserve indices
            if not dry_run:
                for var_idx in sorted(variations_to_remove, reverse=True):
                    del example['variations'][var_idx]

            # If example has no variations left, mark for removal
            if not dry_run and not example['variations']:
                examples_to_remove.append(example_idx)

        # Remove examples in reverse order
        if not dry_run:
            for example_idx in sorted(examples_to_remove, reverse=True):
                del section['examples'][example_idx]

        # If section has no examples left, mark for removal
        if not dry_run and not section['examples']:
            sections_to_remove.append(section_idx)

    # Remove sections in reverse order
    if not dry_run:
        for section_idx in sorted(sections_to_remove, reverse=True):
            del config['sections'][section_idx]

    return removed

def main():
    parser = argparse.ArgumentParser(description='Sync examples config with actual files')
    parser.add_argument('--remove-missing', action='store_true',
                        help='Remove files from config that no longer exist')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be changed without modifying files')
    args = parser.parse_args()

    # Paths
    script_dir = Path(__file__).parent
    config_file = script_dir / 'examples_config.json'
    examples_dir = script_dir.parent / 'dist' / 'examples'

    if not examples_dir.exists():
        print(f"Error: {examples_dir} does not exist")
        return 1

    # Read config
    print(f"Reading config from {config_file}")
    with open(config_file, 'r') as f:
        config = json.load(f)

    # Scan examples directory
    print(f"Scanning {examples_dir}")
    examples_by_dir = scan_examples_dir(examples_dir)

    total_files = sum(len(files) for files in examples_by_dir.values())
    print(f"Found {total_files} JSON files across {len(examples_by_dir)} directories")
    print()

    # Add missing files
    print("Checking for missing files in config...")
    added = add_missing_files(config, examples_by_dir, dry_run=args.dry_run)

    if added:
        print(f"\nFiles to add ({len(added)}):")
        for directory, filename in added:
            print(f"  + {directory}/{filename}")
    else:
        print("  No missing files")

    # Remove missing files (if requested)
    removed = []
    if args.remove_missing:
        print("\nChecking for files in config that no longer exist...")
        removed = remove_missing_files(config, examples_by_dir, dry_run=args.dry_run)

        if removed:
            print(f"\nFiles to remove ({len(removed)}):")
            for directory, filename in removed:
                print(f"  - {directory}/{filename}")
        else:
            print("  No obsolete files")

    # Write config
    if not args.dry_run and (added or removed):
        print(f"\nWriting updated config to {config_file}")
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        print("✓ Config updated")

        if added:
            print("\n⚠️  Manual review required:")
            print("   - Update descriptions for new examples")
            print("   - Organize into appropriate sections")
            print("   - Add meaningful variation labels")
            print("   - Add params for variations")
    elif args.dry_run:
        print("\n(Dry run - no changes made)")
    else:
        print("\n✓ Config is in sync")

    return 0

if __name__ == '__main__':
    exit(main())
