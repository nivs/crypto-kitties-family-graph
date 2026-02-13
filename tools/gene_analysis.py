#!/usr/bin/env python3
"""
CryptoKitties Genetic Analysis Tools

Analyzes genetic data from CryptoKitties JSON files:
- Decode genes to kai format and trait blocks
- Trace inheritance patterns
- Detect mutations and mewtation tiers
- Analyze genetic diversity
- Map founder gene pools

Usage:
    python3 gene_analysis.py kitties.json [--full] [--mutations] [--diversity] [--founders]
    python3 gene_analysis.py kitties.json --trace KITTY_ID
    python3 gene_analysis.py kitties.json --mewtations
    python3 gene_analysis.py kitties.json --all

Examples:
    python3 gene_analysis.py ../dist/examples/nivs/nivs_full_parents.json --all
    python3 gene_analysis.py ../dist/examples/nivs/nivs_full_parents.json --trace 124653
    python3 gene_analysis.py ../dist/examples/nivs/nivs_full_parents.json --mewtations
"""

import argparse
import json
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple, Optional, Any

# Import trait data (mewtation tiers, trait names, etc.)
try:
    from ck_traits import (
        get_mewtation_tier, get_tier_rank, get_trait_name,
        TRAIT_CATEGORIES, TRAIT_NAMES, KAI
    )
    HAS_TRAIT_DATA = True
except ImportError:
    HAS_TRAIT_DATA = False
    # Fallback definitions
    TRAIT_NAMES = [
        'body', 'pattern', 'eyecolor', 'eyeshape',
        'basecolor', 'highlight', 'accent', 'wild',
        'mouth', 'environment', 'secret', 'purrstige'
    ]
    KAI = '123456789abcdefghijkmnopqrstuvwx'

    def get_mewtation_tier(kai_char):
        idx = KAI.index(kai_char) if kai_char in KAI else -1
        if idx <= 15: return 'base'
        elif idx <= 23: return 'I'
        elif idx <= 27: return 'II'
        elif idx <= 29: return 'III'
        elif idx == 30: return 'IIII'
        return None

    def get_tier_rank(tier):
        return {'base': 0, 'I': 1, 'II': 2, 'III': 3, 'IIII': 4}.get(tier, -1)

    def get_trait_name(category_idx, kai_char):
        return None  # No trait names without ck_traits.py

# CryptoKitties gene structure:
# 256 bits = 48 "kai" genes (each 5 bits = values 0-31)
# Grouped into 12 trait categories, 4 genes each (dominant + 3 recessive)


def genes_to_kai(genes_int: int | str) -> str:
    """Convert genes integer to kai string (48 chars)."""
    kai = ''
    n = int(genes_int)
    for _ in range(48):
        kai = KAI[n % 32] + kai
        n //= 32
    return kai


def kai_to_int(kai: str) -> int:
    """Convert kai string back to genes integer."""
    n = 0
    for char in kai:
        n = n * 32 + KAI.index(char)
    return n


def kai_to_trait_blocks(kai: str) -> List[str]:
    """Return list of 12 trait blocks, each with 4 alleles (d, r1, r2, r3)."""
    # Traits are stored LSB-first in the gene, so reverse the kai string
    kai_rev = kai[::-1]
    blocks = []
    for i in range(12):
        start = i * 4
        blocks.append(kai_rev[start:start + 4])
    return blocks


def decode_traits(genes_int: int | str) -> Dict[str, Dict[str, str]]:
    """Decode genes to a dictionary of trait blocks with named alleles."""
    kai = genes_to_kai(genes_int)
    blocks = kai_to_trait_blocks(kai)
    traits = {}
    for i, name in enumerate(TRAIT_NAMES):
        block = blocks[i]
        traits[name] = {
            'd': block[0],    # dominant (expressed)
            'r1': block[1],   # recessive 1
            'r2': block[2],   # recessive 2
            'r3': block[3]    # recessive 3
        }
    return traits


def get_all_alleles(genes_int: int | str, trait_idx: int) -> Set[str]:
    """Get all 4 alleles for a specific trait."""
    kai = genes_to_kai(genes_int)
    blocks = kai_to_trait_blocks(kai)
    return set(blocks[trait_idx])


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


def print_kitty_genome(kitty: Dict, kitties: Dict[int, Dict] = None):
    """Print detailed genome information for a kitty."""
    kid = kitty['id']
    name = kitty.get('name') or 'unnamed'
    gen = kitty.get('generation', '?')
    genes = kitty.get('genes')

    print(f"=== Kitty #{kid} ({name}) ===")
    print(f"Generation: {gen}")

    matron_id = kitty.get('matron_id')
    sire_id = kitty.get('sire_id')
    print(f"Parents: matron={matron_id}, sire={sire_id}")
    print()

    if not genes:
        print("No genes data available")
        return

    kai = genes_to_kai(genes)
    print(f"Genes (decimal): {genes}")
    print(f"Genes (kai):     {kai}")
    print()

    traits = decode_traits(genes)
    blocks = kai_to_trait_blocks(kai)

    # Print with trait names and mewtation tiers
    print("Decoded traits (d=dominant, r1/r2/r3=recessive):")
    print("-" * 80)
    print(f"{'Category':<12} {'D':^6} {'R1':^6} {'R2':^6} {'R3':^6}  Dominant Trait (Tier)")
    print("-" * 80)

    mewtation_count = 0
    for i, trait_name in enumerate(TRAIT_NAMES):
        alleles = traits[trait_name]
        d_char = alleles['d']
        tier = get_mewtation_tier(d_char)
        trait = get_trait_name(i, d_char) if HAS_TRAIT_DATA else None

        # Count mewtations (non-base dominant traits)
        if tier and tier != 'base':
            mewtation_count += 1

        # Format tier display
        tier_str = f" ({tier})" if tier and tier != 'base' else ""
        trait_str = trait or '?'

        print(f"  {trait_name:<12} {d_char:^6} {alleles['r1']:^6} {alleles['r2']:^6} {alleles['r3']:^6}  {trait_str}{tier_str}")

    print("-" * 80)
    print(f"Mewtations in dominant genes: {mewtation_count}/12")

    # Compare to API traits if available
    api_traits = kitty.get('traits', {})
    if api_traits:
        print("\nAPI-reported traits:")
        for trait_type, value in api_traits.items():
            print(f"  {trait_type}: {value}")


def analyze_inheritance(kitties: Dict[int, Dict]) -> Dict[str, Any]:
    """Analyze inheritance patterns and detect mutations."""
    stats = defaultdict(lambda: {'from_parent': 0, 'mutation': 0, 'total': 0})
    mutation_events = []
    analyzed = 0

    for kid, k in kitties.items():
        matron_id = k.get('matron_id')
        sire_id = k.get('sire_id')

        if not matron_id or not sire_id:
            continue
        if matron_id not in kitties or sire_id not in kitties:
            continue

        matron_genes = kitties[matron_id].get('genes')
        sire_genes = kitties[sire_id].get('genes')
        child_genes = k.get('genes')

        if not all([matron_genes, sire_genes, child_genes]):
            continue

        analyzed += 1

        for trait_idx, trait_name in enumerate(TRAIT_NAMES):
            child_alleles = get_all_alleles(child_genes, trait_idx)
            matron_alleles = get_all_alleles(matron_genes, trait_idx)
            sire_alleles = get_all_alleles(sire_genes, trait_idx)
            parent_pool = matron_alleles | sire_alleles

            for allele in child_alleles:
                stats[trait_name]['total'] += 1
                if allele in parent_pool:
                    stats[trait_name]['from_parent'] += 1
                else:
                    stats[trait_name]['mutation'] += 1
                    mutation_events.append({
                        'kitty_id': kid,
                        'trait': trait_name,
                        'allele': allele,
                        'matron_alleles': matron_alleles,
                        'sire_alleles': sire_alleles,
                        'generation': k.get('generation')
                    })

    return {
        'analyzed': analyzed,
        'stats': dict(stats),
        'mutations': mutation_events
    }


def analyze_diversity(kitties: Dict[int, Dict]) -> Dict[str, Dict]:
    """Analyze genetic diversity across the collection."""
    diversity = {}

    for trait_idx, trait in enumerate(TRAIT_NAMES):
        all_alleles = Counter()
        dominant_alleles = Counter()

        for k in kitties.values():
            genes = k.get('genes')
            if not genes:
                continue

            kai = genes_to_kai(genes)
            blocks = kai_to_trait_blocks(kai)
            block = blocks[trait_idx]

            for allele in block:
                all_alleles[allele] += 1
            dominant_alleles[block[0]] += 1

        diversity[trait] = {
            'unique_alleles': len(all_alleles),
            'total_samples': sum(all_alleles.values()),
            'allele_counts': dict(all_alleles),
            'dominant_counts': dict(dominant_alleles),
            'top_dominant': dominant_alleles.most_common(5)
        }

    return diversity


def analyze_founders(kitties: Dict[int, Dict]) -> Dict[str, Any]:
    """Analyze the Gen 0 founder gene pool."""
    gen0_cats = [k for k in kitties.values() if k.get('generation') == 0]

    founder_traits = defaultdict(Counter)
    for k in gen0_cats:
        genes = k.get('genes')
        if not genes:
            continue

        kai = genes_to_kai(genes)
        blocks = kai_to_trait_blocks(kai)

        for i, trait in enumerate(TRAIT_NAMES):
            dominant = blocks[i][0]
            founder_traits[trait][dominant] += 1

    return {
        'count': len(gen0_cats),
        'trait_dominants': {trait: dict(counts) for trait, counts in founder_traits.items()},
        'top_by_trait': {trait: counts.most_common(5) for trait, counts in founder_traits.items()}
    }


def find_first_mutations(kitties: Dict[int, Dict]) -> Dict[Tuple[str, str], int]:
    """Find the first occurrence of each mutation."""
    first_mutation = {}

    for k in sorted(kitties.values(), key=lambda x: x.get('id', 0)):
        kid = k.get('id')
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

        for trait_idx, trait in enumerate(TRAIT_NAMES):
            child_alleles = get_all_alleles(child_genes, trait_idx)
            parent_alleles = get_all_alleles(matron_genes, trait_idx) | get_all_alleles(sire_genes, trait_idx)

            for allele in child_alleles - parent_alleles:
                key = (trait, allele)
                if key not in first_mutation:
                    first_mutation[key] = kid

    return first_mutation


def trace_ancestry(kitty_id: int, kitties: Dict[int, Dict], matron_only: bool = False) -> List[Tuple[int, str, int]]:
    """Trace ancestry path to Gen 0."""
    path = []
    current_id = kitty_id

    while current_id and current_id in kitties:
        k = kitties[current_id]
        name = k.get('name') or 'unnamed'
        gen = k.get('generation')
        path.append((current_id, name, gen))

        if gen == 0:
            break

        if matron_only:
            current_id = k.get('matron_id')
        else:
            # For full trace, we'd need to handle both parents (tree structure)
            current_id = k.get('matron_id')

    return path


def print_inheritance_report(result: Dict[str, Any]):
    """Print inheritance analysis report."""
    print(f"\n=== INHERITANCE ANALYSIS ===\n")
    print(f"Analyzed {result['analyzed']} kitties with both parents in dataset\n")

    print("INHERITANCE RATES BY TRAIT:")
    print("-" * 60)
    print(f"{'Trait':<12} {'From Parents':>12} {'Mutations':>12} {'Mutation Rate':>14}")
    print("-" * 60)

    total_from_parent = 0
    total_mutations = 0

    for trait in TRAIT_NAMES:
        stats = result['stats'].get(trait, {'from_parent': 0, 'mutation': 0, 'total': 0})
        from_p = stats['from_parent']
        mut = stats['mutation']
        total = stats['total']
        rate = (mut / total * 100) if total > 0 else 0
        total_from_parent += from_p
        total_mutations += mut
        print(f"{trait:<12} {from_p:>12} {mut:>12} {rate:>13.2f}%")

    print("-" * 60)
    total = total_from_parent + total_mutations
    overall_rate = (total_mutations / total * 100) if total > 0 else 0
    print(f"{'TOTAL':<12} {total_from_parent:>12} {total_mutations:>12} {overall_rate:>13.2f}%")


def print_mutation_report(mutations: List[Dict], limit: int = 10):
    """Print mutation events."""
    print(f"\n=== MUTATION EVENTS ({min(limit, len(mutations))} of {len(mutations)}) ===\n")

    for m in mutations[:limit]:
        print(f"Kitty #{m['kitty_id']} (Gen {m['generation']})")
        print(f"  Trait: {m['trait']}")
        print(f"  Child allele: '{m['allele']}' (not in parents)")
        print(f"  Matron alleles: {m['matron_alleles']}")
        print(f"  Sire alleles: {m['sire_alleles']}")
        print()


def print_diversity_report(diversity: Dict[str, Dict]):
    """Print genetic diversity report."""
    print(f"\n=== GENETIC DIVERSITY ANALYSIS ===\n")
    print(f"{'Trait':<12} {'Unique Alleles':>14} {'Top Dominant (expressed) Alleles'}")
    print("-" * 65)

    for trait in TRAIT_NAMES:
        d = diversity[trait]
        top = ', '.join(f"'{a}'({c})" for a, c in d['top_dominant'][:3])
        print(f"{trait:<12} {d['unique_alleles']:>14} {top}")


def print_founder_report(founders: Dict[str, Any]):
    """Print founder gene pool report."""
    print(f"\n=== FOUNDER GENE POOL (Gen 0) ===\n")
    print(f"Analyzing {founders['count']} Gen 0 founders...\n")

    print("Most common DOMINANT alleles in Gen 0 founders:")
    print("-" * 50)

    for trait in TRAIT_NAMES:
        top = founders['top_by_trait'].get(trait, [])
        if top:
            top_str = ', '.join(f"'{a}'({c})" for a, c in top[:3])
            print(f"{trait:<12}: {top_str}")


def print_first_mutations_report(first_mutations: Dict[Tuple[str, str], int]):
    """Print first mutation discoveries."""
    print(f"\n=== MEWTATION DISCOVERY TIMELINE ===\n")
    print(f"Found {len(first_mutations)} unique mutation events (first occurrences)\n")

    by_trait = defaultdict(list)
    for (trait, allele), kid in first_mutations.items():
        by_trait[trait].append((allele, kid))

    for trait in TRAIT_NAMES:
        mutations = by_trait.get(trait, [])
        if mutations:
            mut_str = ', '.join(f"'{a}'→#{k}" for a, k in sorted(mutations, key=lambda x: x[1])[:5])
            print(f"{trait:<12}: {mut_str}")


def analyze_mewtations(kitties: Dict[int, Dict]) -> Dict[str, Any]:
    """Analyze mewtation distribution across the collection."""
    tier_counts = defaultdict(Counter)  # tier -> trait -> count
    kitty_mewtations = []  # List of (kitty_id, mewtation_count, top_tier)

    for kid, k in kitties.items():
        genes = k.get('genes')
        if not genes:
            continue

        kai = genes_to_kai(genes)
        blocks = kai_to_trait_blocks(kai)

        kitty_tiers = []
        for i, trait in enumerate(TRAIT_NAMES):
            d_char = blocks[i][0]  # Dominant allele
            tier = get_mewtation_tier(d_char)
            if tier:
                tier_counts[tier][trait] += 1
                if tier != 'base':
                    kitty_tiers.append((trait, tier, d_char))

        if kitty_tiers:
            # Find highest tier
            top_tier = max(kitty_tiers, key=lambda x: get_tier_rank(x[1]))
            kitty_mewtations.append((kid, len(kitty_tiers), top_tier))

    # Sort by number of mewtations (descending)
    kitty_mewtations.sort(key=lambda x: (-x[1], -get_tier_rank(x[2][1])))

    return {
        'tier_counts': {tier: dict(counts) for tier, counts in tier_counts.items()},
        'top_kitties': kitty_mewtations[:20],
        'total_analyzed': len(kitties),
    }


def print_mewtation_report(result: Dict[str, Any], kitties: Dict[int, Dict]):
    """Print mewtation analysis report."""
    print(f"\n=== MEWTATION ANALYSIS ===\n")
    print(f"Analyzed {result['total_analyzed']} kitties\n")

    # Tier distribution
    print("DOMINANT ALLELE TIER DISTRIBUTION:")
    print("-" * 60)
    print(f"{'Tier':<8} {'Count':>10} {'Description'}")
    print("-" * 60)

    tier_order = ['base', 'I', 'II', 'III', 'IIII']
    tier_descriptions = {
        'base': 'Base traits (Kai 1-g)',
        'I': 'Tier I mewtations (Kai h-p)',
        'II': 'Tier II mewtations (Kai q-t)',
        'III': 'Tier III mewtations (Kai u-v)',
        'IIII': 'Tier IIII mewtations (Kai w) - rarest',
    }

    for tier in tier_order:
        counts = result['tier_counts'].get(tier, {})
        total = sum(counts.values())
        print(f"{tier:<8} {total:>10}   {tier_descriptions.get(tier, '')}")

    # Top kitties with mewtations
    print(f"\n\nTOP KITTIES BY MEWTATION COUNT:")
    print("-" * 70)
    print(f"{'Kitty ID':>10} {'Name':<20} {'Gen':>4} {'Mewts':>6} {'Top Mewtation'}")
    print("-" * 70)

    for kid, mewt_count, (trait, tier, char) in result['top_kitties'][:10]:
        k = kitties.get(kid, {})
        name = (k.get('name') or 'unnamed')[:20]
        gen = k.get('generation', '?')
        trait_name = get_trait_name(TRAIT_NAMES.index(trait), char) if HAS_TRAIT_DATA else char
        print(f"{kid:>10} {name:<20} {gen:>4} {mewt_count:>6}   {trait}: {trait_name or char} ({tier})")

    # Tier breakdown by trait
    print(f"\n\nMEWTATION COUNT BY TRAIT AND TIER:")
    print("-" * 70)
    header = f"{'Trait':<12}"
    for tier in ['I', 'II', 'III', 'IIII']:
        header += f" {tier:>8}"
    print(header)
    print("-" * 70)

    for trait in TRAIT_NAMES:
        row = f"{trait:<12}"
        for tier in ['I', 'II', 'III', 'IIII']:
            count = result['tier_counts'].get(tier, {}).get(trait, 0)
            row += f" {count:>8}"
        print(row)


def main():
    parser = argparse.ArgumentParser(
        description="CryptoKitties genetic analysis tools",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('json_file', help='JSON file with kitty data')
    parser.add_argument('--full', action='store_true', help='Print full genome for root kitties')
    parser.add_argument('--mutations', action='store_true', help='Analyze mutations')
    parser.add_argument('--diversity', action='store_true', help='Analyze genetic diversity')
    parser.add_argument('--founders', action='store_true', help='Analyze founder gene pool')
    parser.add_argument('--mewtations', action='store_true', help='Analyze mewtation distribution')
    parser.add_argument('--trace', type=int, metavar='ID', help='Trace ancestry for a specific kitty')
    parser.add_argument('--all', action='store_true', help='Run all analyses')
    parser.add_argument('--limit', type=int, default=10, help='Limit mutation output (default: 10)')

    args = parser.parse_args()

    # Load data
    kitties, root_ids = load_kitties(args.json_file)
    print(f"Loaded {len(kitties)} kitties from {args.json_file}")
    print(f"Root IDs: {root_ids}")

    # Generation distribution
    gens = Counter(k.get('generation') for k in kitties.values() if k.get('generation') is not None)
    print(f"Generations: {min(gens.keys())} to {max(gens.keys())}")
    print()

    if args.trace:
        if args.trace not in kitties:
            print(f"Kitty #{args.trace} not found in dataset")
            return 1

        print(f"\n=== ANCESTRY TRACE: #{args.trace} ===\n")
        print_kitty_genome(kitties[args.trace], kitties)

        print(f"\nMatron line to Gen 0:")
        path = trace_ancestry(args.trace, kitties, matron_only=True)
        for kid, name, gen in path:
            print(f"  Gen {gen:>2}: #{kid:>6} ({name})")
        print(f"\nReached Gen 0 founder in {len(path)} generations")
        return 0

    if args.full or args.all:
        print("\n=== ROOT KITTY GENOMES ===")
        for rid in root_ids[:3]:  # Limit to first 3 for readability
            if rid in kitties:
                print()
                print_kitty_genome(kitties[rid], kitties)

    if args.mutations or args.all:
        result = analyze_inheritance(kitties)
        print_inheritance_report(result)
        print_mutation_report(result['mutations'], args.limit)

        first_mutations = find_first_mutations(kitties)
        print_first_mutations_report(first_mutations)

    if args.diversity or args.all:
        diversity = analyze_diversity(kitties)
        print_diversity_report(diversity)

    if args.founders or args.all:
        founders = analyze_founders(kitties)
        print_founder_report(founders)

    if args.mewtations or args.all:
        mewtations = analyze_mewtations(kitties)
        print_mewtation_report(mewtations, kitties)

    return 0


if __name__ == '__main__':
    exit(main())
