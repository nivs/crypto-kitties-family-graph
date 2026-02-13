#!/usr/bin/env python3
"""
Generate docs/EXAMPLES.md from tools/examples_config.json

Reads the configuration file and generates a markdown documentation page
with links to all example datasets on the live website.

Usage:
    python3 generate_examples_md.py
"""

import json
import os
from pathlib import Path

def generate_url(base_url, directory, file, params=None):
    """Generate a full URL for an example."""
    url = f"{base_url}?dataUrl=./examples/{directory}/{file}"
    if params:
        url += f"&{params}"
    return url

def generate_markdown(config):
    """Generate markdown content from configuration."""
    lines = []

    # Header
    lines.append("# CryptoKitties Family Graph - Examples")
    lines.append("")
    lines.append("Interactive examples showcasing different CryptoKitties datasets and features.")
    lines.append("")
    lines.append(f"**Live site:** [{config['base_url']}]({config['base_url']})")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Table of Contents
    lines.append("## Table of Contents")
    lines.append("")
    for i, section in enumerate(config['sections'], 1):
        lines.append(f"{i}. [{section['title']}](#{section['title'].lower().replace(' ', '-')})")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Sections
    for section in config['sections']:
        lines.append(f"## {section['title']}")
        lines.append("")
        lines.append(section['description'])
        lines.append("")

        # Examples within section
        for example in section['examples']:
            lines.append(f"### {example['name']}")
            lines.append("")
            lines.append(example['description'])
            lines.append("")

            # Always add base link without params (uses first variation's file)
            base_file = example['variations'][0]['file']
            base_url = generate_url(config['base_url'], example['directory'], base_file)
            lines.append(f"**[View →]({base_url})**")
            lines.append("")

            # Variations (if more than one, or if first has params/note)
            if len(example['variations']) > 1 or example['variations'][0].get('params') or example['variations'][0].get('note'):
                lines.append("**Variations:**")
                lines.append("")
                for var in example['variations']:
                    url = generate_url(config['base_url'], example['directory'], var['file'], var.get('params'))
                    line = f"- **[{var['label']}]({url})**"
                    if 'note' in var:
                        line += f" - *{var['note']}*"
                    lines.append(line)
                lines.append("")

        lines.append("---")
        lines.append("")

    # Footer
    lines.append("## About")
    lines.append("")
    lines.append("This documentation is auto-generated from `tools/examples_config.json`.")
    lines.append("")
    lines.append("To update:")
    lines.append("1. Edit `tools/examples_config.json`")
    lines.append("2. Run `python3 tools/generate_examples_md.py`")
    lines.append("")
    lines.append("See [README.md](../README.md) for more information about the project.")
    lines.append("")

    return '\n'.join(lines)

def main():
    # Paths
    script_dir = Path(__file__).parent
    config_file = script_dir / 'examples_config.json'
    output_file = script_dir.parent / 'docs' / 'EXAMPLES.md'

    # Read config
    print(f"Reading configuration from {config_file}")
    with open(config_file, 'r') as f:
        config = json.load(f)

    # Generate markdown
    print("Generating markdown...")
    markdown = generate_markdown(config)

    # Ensure output directory exists
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    print(f"Writing to {output_file}")
    with open(output_file, 'w') as f:
        f.write(markdown)

    # Count examples
    total_examples = sum(len(section['examples']) for section in config['sections'])
    total_variations = sum(
        len(example['variations'])
        for section in config['sections']
        for example in section['examples']
    )

    print(f"✓ Generated {total_examples} examples ({total_variations} variations) across {len(config['sections'])} sections")

if __name__ == '__main__':
    main()
