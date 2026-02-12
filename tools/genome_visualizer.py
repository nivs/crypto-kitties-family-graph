#!/usr/bin/env python3
"""
CryptoKitties Genome Visualizer

Generates visual representations of kitty genomes for blog posts:
- Genome strips (trait blocks with alleles)
- Inheritance diagrams
- Mutation heatmaps

Requires: matplotlib, numpy (pip install matplotlib numpy)

Usage:
    python3 genome_visualizer.py kitties.json --strip KITTY_ID
    python3 genome_visualizer.py kitties.json --compare ID1 ID2
    python3 genome_visualizer.py kitties.json --inheritance CHILD_ID
    python3 genome_visualizer.py kitties.json --heatmap
"""

import argparse
import json
from collections import Counter, defaultdict
from typing import Dict, List, Tuple

try:
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    import numpy as np
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
    print("Warning: matplotlib not installed. Install with: pip install matplotlib numpy")

# Gene constants
TRAIT_NAMES = [
    'body', 'pattern', 'eyecolor', 'eyeshape',
    'basecolor', 'highlight', 'accent', 'wild',
    'mouth', 'environment', 'secret', 'purrstige'
]

KAI = '123456789abcdefghijkmnopqrstuvwx'

# Color palette for alleles (based on kai character)
ALLELE_COLORS = {
    '1': '#FF6B6B', '2': '#FF8E72', '3': '#FFB347', '4': '#FFD93D',
    '5': '#B4FF9F', '6': '#6BCB77', '7': '#4D96FF', '8': '#6C63FF',
    '9': '#9B59B6', 'a': '#E74C3C', 'b': '#3498DB', 'c': '#1ABC9C',
    'd': '#F39C12', 'e': '#9B59B6', 'f': '#34495E', 'g': '#95A5A6',
    'h': '#E91E63', 'i': '#673AB7', 'j': '#2196F3', 'k': '#00BCD4',
    'm': '#4CAF50', 'n': '#8BC34A', 'p': '#CDDC39', 'q': '#FFEB3B',
    'r': '#FFC107', 's': '#FF9800', 't': '#FF5722', 'u': '#795548',
    'v': '#607D8B', 'w': '#9E9E9E', 'x': '#000000'
}


def genes_to_kai(genes_int: int | str) -> str:
    """Convert genes integer to kai string (48 chars)."""
    kai = ''
    n = int(genes_int)
    for _ in range(48):
        kai = KAI[n % 32] + kai
        n //= 32
    return kai


def kai_to_trait_blocks(kai: str) -> List[str]:
    """Return list of 12 trait blocks, each with 4 alleles."""
    kai_rev = kai[::-1]
    blocks = []
    for i in range(12):
        start = i * 4
        blocks.append(kai_rev[start:start + 4])
    return blocks


def load_kitties(json_path: str) -> Tuple[Dict[int, Dict], List[int]]:
    """Load kitties from JSON file."""
    with open(json_path, 'r') as f:
        data = json.load(f)
    kitties = {int(k['id']): k for k in data.get('kitties', []) if k.get('id')}
    root_ids = [int(r) for r in data.get('root_ids', [])]
    return kitties, root_ids


def draw_genome_strip(kitty: Dict, ax=None, show_labels: bool = True):
    """Draw a genome strip visualization for a kitty."""
    if not HAS_MATPLOTLIB:
        print("matplotlib required for visualization")
        return

    genes = kitty.get('genes')
    if not genes:
        print(f"No genes for kitty #{kitty.get('id')}")
        return

    kai = genes_to_kai(genes)
    blocks = kai_to_trait_blocks(kai)

    if ax is None:
        fig, ax = plt.subplots(figsize=(14, 2))

    # Draw blocks
    for trait_idx, block in enumerate(blocks):
        for allele_idx, allele in enumerate(block):
            x = trait_idx * 5 + allele_idx
            color = ALLELE_COLORS.get(allele, '#CCCCCC')

            # Dominant allele is larger
            height = 1.0 if allele_idx == 0 else 0.6
            y_offset = 0 if allele_idx == 0 else 0.2

            rect = mpatches.FancyBboxPatch(
                (x, y_offset), 0.9, height,
                boxstyle="round,pad=0.02",
                facecolor=color,
                edgecolor='white',
                linewidth=1
            )
            ax.add_patch(rect)

            # Allele label
            ax.text(x + 0.45, y_offset + height / 2, allele,
                   ha='center', va='center',
                   fontsize=10, fontweight='bold', color='white')

    # Trait labels
    if show_labels:
        for i, trait in enumerate(TRAIT_NAMES):
            ax.text(i * 5 + 2, -0.3, trait, ha='center', va='top',
                   fontsize=8, rotation=45)

    ax.set_xlim(-0.5, 60)
    ax.set_ylim(-1.5 if show_labels else -0.2, 1.2)
    ax.set_aspect('equal')
    ax.axis('off')

    name = kitty.get('name') or f"Kitty #{kitty.get('id')}"
    ax.set_title(f"{name} (Gen {kitty.get('generation', '?')})", fontsize=12, fontweight='bold')

    return ax


def draw_inheritance_diagram(child: Dict, matron: Dict, sire: Dict, kitties: Dict):
    """Draw inheritance diagram showing how child got its alleles."""
    if not HAS_MATPLOTLIB:
        print("matplotlib required for visualization")
        return

    fig, axes = plt.subplots(3, 1, figsize=(14, 8))

    # Draw parent and child strips
    draw_genome_strip(matron, axes[0], show_labels=False)
    matron_name = matron.get('name') or f"#{matron.get('id')}"
    axes[0].set_title(f"Matron: {matron_name} (Gen {matron.get('generation')})")

    draw_genome_strip(sire, axes[1], show_labels=False)
    sire_name = sire.get('name') or f"#{sire.get('id')}"
    axes[1].set_title(f"Sire: {sire_name} (Gen {sire.get('generation')})")

    draw_genome_strip(child, axes[2], show_labels=True)
    child_name = child.get('name') or f"#{child.get('id')}"
    axes[2].set_title(f"Child: {child_name} (Gen {child.get('generation')})")

    plt.tight_layout()
    return fig


def draw_diversity_heatmap(kitties: Dict[int, Dict]):
    """Draw heatmap showing allele diversity across traits."""
    if not HAS_MATPLOTLIB:
        print("matplotlib required for visualization")
        return

    # Count alleles per trait
    trait_alleles = defaultdict(Counter)

    for k in kitties.values():
        genes = k.get('genes')
        if not genes:
            continue

        blocks = kai_to_trait_blocks(genes_to_kai(genes))
        for i, trait in enumerate(TRAIT_NAMES):
            for allele in blocks[i]:
                trait_alleles[trait][allele] += 1

    # Create matrix
    all_alleles = sorted(set(a for counts in trait_alleles.values() for a in counts.keys()))
    matrix = np.zeros((len(TRAIT_NAMES), len(all_alleles)))

    for i, trait in enumerate(TRAIT_NAMES):
        for j, allele in enumerate(all_alleles):
            matrix[i, j] = trait_alleles[trait].get(allele, 0)

    # Normalize by row
    row_sums = matrix.sum(axis=1, keepdims=True)
    matrix_norm = np.divide(matrix, row_sums, where=row_sums != 0)

    # Plot
    fig, ax = plt.subplots(figsize=(16, 8))
    im = ax.imshow(matrix_norm, aspect='auto', cmap='YlOrRd')

    ax.set_xticks(range(len(all_alleles)))
    ax.set_xticklabels(all_alleles, fontsize=8)
    ax.set_yticks(range(len(TRAIT_NAMES)))
    ax.set_yticklabels(TRAIT_NAMES)

    ax.set_xlabel('Allele')
    ax.set_ylabel('Trait')
    ax.set_title('Allele Distribution Heatmap (normalized by trait)')

    plt.colorbar(im, label='Frequency')
    plt.tight_layout()
    return fig


def draw_mutation_rate_chart(kitties: Dict[int, Dict]):
    """Draw bar chart of mutation rates by trait."""
    if not HAS_MATPLOTLIB:
        print("matplotlib required for visualization")
        return

    # Calculate mutation rates
    stats = {trait: {'from_parent': 0, 'mutation': 0} for trait in TRAIT_NAMES}

    for kid, k in kitties.items():
        matron_id = k.get('matron_id')
        sire_id = k.get('sire_id')

        if not matron_id or not sire_id:
            continue
        if matron_id not in kitties or sire_id not in kitties:
            continue

        child_genes = k.get('genes')
        matron_genes = kitties[matron_id].get('genes')
        sire_genes = kitties[sire_id].get('genes')

        if not all([child_genes, matron_genes, sire_genes]):
            continue

        child_blocks = kai_to_trait_blocks(genes_to_kai(child_genes))
        matron_blocks = kai_to_trait_blocks(genes_to_kai(matron_genes))
        sire_blocks = kai_to_trait_blocks(genes_to_kai(sire_genes))

        for i, trait in enumerate(TRAIT_NAMES):
            parent_alleles = set(matron_blocks[i]) | set(sire_blocks[i])
            for allele in child_blocks[i]:
                if allele in parent_alleles:
                    stats[trait]['from_parent'] += 1
                else:
                    stats[trait]['mutation'] += 1

    # Calculate rates
    rates = []
    for trait in TRAIT_NAMES:
        total = stats[trait]['from_parent'] + stats[trait]['mutation']
        rate = (stats[trait]['mutation'] / total * 100) if total > 0 else 0
        rates.append(rate)

    # Plot
    fig, ax = plt.subplots(figsize=(12, 6))

    colors = ['#FF6B6B' if r > 1.0 else '#4ECDC4' for r in rates]
    bars = ax.bar(TRAIT_NAMES, rates, color=colors, edgecolor='white', linewidth=1)

    ax.set_ylabel('Mutation Rate (%)')
    ax.set_xlabel('Trait')
    ax.set_title('Mutation Rate by Trait')
    ax.axhline(y=sum(rates) / len(rates), color='#666', linestyle='--', label='Average')

    plt.xticks(rotation=45, ha='right')
    plt.legend()
    plt.tight_layout()
    return fig


def print_ascii_genome_strip(kitty: Dict):
    """Print ASCII representation of genome for terminals without matplotlib."""
    genes = kitty.get('genes')
    if not genes:
        print(f"No genes for kitty #{kitty.get('id')}")
        return

    kai = genes_to_kai(genes)
    blocks = kai_to_trait_blocks(kai)

    name = kitty.get('name') or f"Kitty #{kitty.get('id')}"
    print(f"\n{'=' * 70}")
    print(f"  {name} (Gen {kitty.get('generation', '?')})")
    print(f"{'=' * 70}")
    print(f"  Genes: {kai[:24]}...")
    print()

    print("  Trait         D   R1  R2  R3   (D=dominant, R=recessive)")
    print("  " + "-" * 50)

    for i, trait in enumerate(TRAIT_NAMES):
        block = blocks[i]
        d, r1, r2, r3 = block[0], block[1], block[2], block[3]
        print(f"  {trait:<12}  [{d}]  {r1}   {r2}   {r3}")

    print()


def main():
    parser = argparse.ArgumentParser(description="CryptoKitties genome visualizer")
    parser.add_argument('json_file', help='JSON file with kitty data')
    parser.add_argument('--strip', type=int, metavar='ID', help='Draw genome strip for kitty')
    parser.add_argument('--compare', type=int, nargs=2, metavar=('ID1', 'ID2'), help='Compare two kitties')
    parser.add_argument('--inheritance', type=int, metavar='CHILD_ID', help='Show inheritance diagram')
    parser.add_argument('--heatmap', action='store_true', help='Draw diversity heatmap')
    parser.add_argument('--mutations', action='store_true', help='Draw mutation rate chart')
    parser.add_argument('--ascii', action='store_true', help='Use ASCII output (no matplotlib)')
    parser.add_argument('--output', '-o', metavar='FILE', help='Save figure to file')

    args = parser.parse_args()

    kitties, root_ids = load_kitties(args.json_file)
    print(f"Loaded {len(kitties)} kitties")

    if args.strip:
        if args.strip not in kitties:
            print(f"Kitty #{args.strip} not found")
            return 1

        if args.ascii or not HAS_MATPLOTLIB:
            print_ascii_genome_strip(kitties[args.strip])
        else:
            fig, ax = plt.subplots(figsize=(14, 2))
            draw_genome_strip(kitties[args.strip], ax)
            if args.output:
                plt.savefig(args.output, dpi=150, bbox_inches='tight')
                print(f"Saved to {args.output}")
            else:
                plt.show()

    elif args.compare:
        id1, id2 = args.compare
        if id1 not in kitties or id2 not in kitties:
            print(f"Kitty not found")
            return 1

        if args.ascii or not HAS_MATPLOTLIB:
            print_ascii_genome_strip(kitties[id1])
            print_ascii_genome_strip(kitties[id2])
        else:
            fig, axes = plt.subplots(2, 1, figsize=(14, 4))
            draw_genome_strip(kitties[id1], axes[0])
            draw_genome_strip(kitties[id2], axes[1])
            plt.tight_layout()
            if args.output:
                plt.savefig(args.output, dpi=150, bbox_inches='tight')
            else:
                plt.show()

    elif args.inheritance:
        child = kitties.get(args.inheritance)
        if not child:
            print(f"Kitty #{args.inheritance} not found")
            return 1

        matron_id = child.get('matron_id')
        sire_id = child.get('sire_id')

        if not matron_id or not sire_id:
            print(f"Kitty #{args.inheritance} has no parents (Gen 0)")
            return 1

        matron = kitties.get(matron_id)
        sire = kitties.get(sire_id)

        if not matron or not sire:
            print(f"Parents not in dataset")
            return 1

        if args.ascii or not HAS_MATPLOTLIB:
            print("\n=== INHERITANCE DIAGRAM ===")
            print("\nMATRON:")
            print_ascii_genome_strip(matron)
            print("\nSIRE:")
            print_ascii_genome_strip(sire)
            print("\nCHILD:")
            print_ascii_genome_strip(child)
        else:
            fig = draw_inheritance_diagram(child, matron, sire, kitties)
            if args.output:
                plt.savefig(args.output, dpi=150, bbox_inches='tight')
            else:
                plt.show()

    elif args.heatmap:
        if not HAS_MATPLOTLIB:
            print("matplotlib required for heatmap")
            return 1
        fig = draw_diversity_heatmap(kitties)
        if args.output:
            plt.savefig(args.output, dpi=150, bbox_inches='tight')
        else:
            plt.show()

    elif args.mutations:
        if not HAS_MATPLOTLIB:
            print("matplotlib required for chart")
            return 1
        fig = draw_mutation_rate_chart(kitties)
        if args.output:
            plt.savefig(args.output, dpi=150, bbox_inches='tight')
        else:
            plt.show()

    else:
        # Default: show ASCII strips for first few root kitties
        print("\nNo visualization option specified. Showing root kitties:\n")
        for rid in root_ids[:3]:
            if rid in kitties:
                print_ascii_genome_strip(kitties[rid])

        print("\nOptions:")
        print("  --strip ID        Show genome strip for a kitty")
        print("  --compare ID ID   Compare two kitties side by side")
        print("  --inheritance ID  Show inheritance from parents to child")
        print("  --heatmap         Show allele diversity heatmap")
        print("  --mutations       Show mutation rate chart")
        print("  --ascii           Force ASCII output (no graphics)")
        print("  -o FILE           Save output to file")

    return 0


if __name__ == '__main__':
    exit(main())
