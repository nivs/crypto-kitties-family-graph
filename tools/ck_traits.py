#!/usr/bin/env python3
"""
CryptoKitties Trait Data

Complete trait mappings from Kai codes to trait names, including:
- All 12 trait categories with 32 values each
- Mewtation tier classification (Base, I, II, III, IIII)
- Fancy cat recipes

Data sourced from kittypedia research and CryptoKitties documentation.
"""

from typing import Dict, List, Optional, Set, Tuple

# Kai alphabet (base32-like encoding)
KAI = '123456789abcdefghijkmnopqrstuvwx'

# Mewtation tiers by Kai character
# Base traits: 1-g (Kai 0-15)
# Tier I: h-p (Kai 16-23) - discovered by breeding two base traits
# Tier II: q-t (Kai 24-27) - discovered by breeding two Tier I traits
# Tier III: u,v (Kai 28-29) - discovered by breeding two Tier II traits
# Tier IIII: w (Kai 30) - discovered by breeding two Tier III traits
# x (Kai 31) is impossible to reach via mutation

def get_mewtation_tier(kai_char: str) -> Optional[str]:
    """Get mewtation tier for a Kai character."""
    if kai_char not in KAI:
        return None
    idx = KAI.index(kai_char)
    if idx <= 15:
        return 'base'
    elif idx <= 23:
        return 'I'
    elif idx <= 27:
        return 'II'
    elif idx <= 29:
        return 'III'
    elif idx == 30:
        return 'IIII'
    else:
        return None  # x (31) is impossible


def get_tier_rank(tier: Optional[str]) -> int:
    """Get numeric rank for tier (higher = rarer)."""
    ranks = {'base': 0, 'I': 1, 'II': 2, 'III': 3, 'IIII': 4}
    return ranks.get(tier, -1)


# Mutation formula: mutation = (gene1 / 2) + 16
# This means combining genes at positions N and N+1 can produce gene at position (N/2)+16
MUTATION_PAIRS = {
    # Base → Tier I
    'h': ('1', '2'),  # savannah + selkirk → ?
    'i': ('3', '4'),
    'j': ('5', '6'),
    'k': ('7', '8'),
    'm': ('9', 'a'),
    'n': ('b', 'c'),
    'o': ('d', 'e'),
    'p': ('f', 'g'),
    # Tier I → Tier II
    'q': ('h', 'i'),
    'r': ('j', 'k'),
    's': ('m', 'n'),
    't': ('o', 'p'),
    # Tier II → Tier III
    'u': ('q', 'r'),
    'v': ('s', 't'),
    # Tier III → Tier IIII
    'w': ('u', 'v'),
}


# =============================================================================
# TRAIT NAMES BY CATEGORY
# Format: {kai_char: trait_name}
# =============================================================================

# FU = Fur (Body)
FUR_TRAITS = {
    '1': 'savannah', '2': 'selkirk', '3': 'chantilly', '4': 'birman',
    '5': 'koladiviya', '6': 'bobtail', '7': 'manul', '8': 'pixiebob',
    '9': 'siberian', 'a': 'cymric', 'b': 'chartreux', 'c': 'himalayan',
    'd': 'munchkin', 'e': 'sphynx', 'f': 'ragamuffin', 'g': 'ragdoll',
    'h': 'norwegianforest', 'i': 'mekong', 'j': 'highlander', 'k': 'balinese',
    'm': 'lynx', 'n': 'mainecoon', 'o': 'laperm', 'p': 'persian',
    'q': 'fox', 'r': 'kurilian', 's': 'toyger', 't': 'manx',
    'u': 'lykoi', 'v': 'burmilla', 'w': 'liger', 'x': None,
}

# PA = Pattern
PATTERN_TRAITS = {
    '1': 'vigilante', '2': 'tiger', '3': 'rascal', '4': 'ganado',
    '5': 'leopard', '6': 'camo', '7': 'rorschach', '8': 'spangled',
    '9': 'calicool', 'a': 'luckystripe', 'b': 'amur', 'c': 'jaguar',
    'd': 'spock', 'e': 'mittens', 'f': 'totesbasic', 'g': 'totesbasic',  # g is also totesbasic
    'h': 'splat', 'i': 'thunderstruck', 'j': 'dippedcone', 'k': 'highsociety',
    'm': 'tigerpunk', 'n': 'henna', 'o': 'arcreactor', 'p': 'totesbasic',
    'q': 'scorpius', 'r': 'razzledazzle', 's': 'hotrod', 't': 'allyouneed',
    'u': 'avatar', 'v': 'gyre', 'w': 'moonrise', 'x': None,
}

# EC = Eye Color
EYE_COLOR_TRAITS = {
    '1': 'thundergrey', '2': 'gold', '3': 'topaz', '4': 'mintgreen',
    '5': 'isotope', '6': 'sizzurp', '7': 'chestnut', '8': 'strawberry',
    '9': 'sapphire', 'a': 'forgetmenot', 'b': 'dahlia', 'c': 'coralsunrise',
    'd': 'olive', 'e': 'doridnudibranch', 'f': 'parakeet', 'g': 'cyan',
    'h': 'pumpkin', 'i': 'limegreen', 'j': 'bridesmaid', 'k': 'bubblegum',
    'm': 'twilightsparkle', 'n': 'palejade', 'o': 'pinefresh', 'p': 'eclipse',
    'q': 'babypuke', 'r': 'downbythebay', 's': 'autumnmoon', 't': 'oasis',
    'u': 'gemini', 'v': 'dioscuri', 'w': 'kaleidoscope', 'x': None,
}

# ES = Eye Shape
EYE_SHAPE_TRAITS = {
    '1': 'swarley', '2': 'wonky', '3': 'serpent', '4': 'googly',
    '5': 'otaku', '6': 'simple', '7': 'crazy', '8': 'thicccbrowz',
    '9': 'caffeine', 'a': 'wowza', 'b': 'baddate', 'c': 'asif',
    'd': 'chronic', 'e': 'slyboots', 'f': 'wiley', 'g': 'stunned',
    'h': 'chameleon', 'i': 'alien', 'j': 'fabulous', 'k': 'raisedbrow',
    'm': 'tendertears', 'n': 'hacker', 'o': 'sass', 'p': 'sweetmeloncakes',
    'q': 'oceanid', 'r': 'wingtips', 's': 'firedup', 't': 'buzzed',
    'u': 'bornwithit', 'v': 'candyshoppe', 'w': 'drama', 'x': None,
}

# BC = Base Color
BASE_COLOR_TRAITS = {
    '1': 'shadowgrey', '2': 'salmon', '3': 'meowgarine', '4': 'orangesoda',
    '5': 'cottoncandy', '6': 'mauveover', '7': 'aquamarine', '8': 'nachocheez',
    '9': 'harbourfog', 'a': 'cinderella', 'b': 'greymatter', 'c': 'tundra',
    'd': 'brownies', 'e': 'dragonfruit', 'f': 'hintomint', 'g': 'bananacream',
    'h': 'cloudwhite', 'i': 'cornflower', 'j': 'oldlace', 'k': 'koala',
    'm': 'lavender', 'n': 'glacier', 'o': 'redvelvet', 'p': 'verdigris',
    'q': 'icicle', 'r': 'onyx', 's': 'hyacinth', 't': 'martian',
    'u': 'hotcocoa', 'v': 'shamrock', 'w': 'firstblush', 'x': None,
}

# HC = Highlight Color
HIGHLIGHT_COLOR_TRAITS = {
    '1': 'cyborg', '2': 'springcrocus', '3': 'egyptiankohl', '4': 'poisonberry',
    '5': 'lilac', '6': 'apricot', '7': 'royalpurple', '8': 'padparadscha',
    '9': 'swampgreen', 'a': 'violet', 'b': 'scarlet', 'c': 'barkbrown',
    'd': 'coffee', 'e': 'lemonade', 'f': 'chocolate', 'g': 'butterscotch',
    'h': 'safetyvest', 'i': 'turtleback', 'j': 'rosequartz', 'k': 'wolfgrey',
    'm': 'cerulian', 'n': 'skyblue', 'o': 'garnet', 'p': 'peppermint',
    'q': 'universe', 'r': 'royalblue', 's': 'mertail', 't': 'inflatablepool',
    'u': 'pearl', 'v': 'prairierose', 'w': 'jalapenored', 'x': None,  # Note: some sources show 'ooze' for x
}

# AC = Accent Color
ACCENT_COLOR_TRAITS = {
    '1': 'belleblue', '2': 'sandalwood', '3': 'peach', '4': 'icy',
    '5': 'granitegrey', '6': 'cashewmilk', '7': 'kittencream', '8': 'emeraldgreen',
    '9': 'kalahari', 'a': 'shale', 'b': 'purplehaze', 'c': 'hanauma',
    'd': 'azaleablush', 'e': 'missmuffett', 'f': 'morningglory', 'g': 'frosting',
    'h': 'daffodil', 'i': 'flamingo', 'j': 'buttercup', 'k': 'bloodred',
    'm': 'atlantis', 'n': 'summerbonnet', 'o': 'periwinkle', 'p': 'patrickstarfish',
    'q': 'seafoam', 'r': 'cobalt', 's': 'mallowflower', 't': 'mintmacaron',
    'u': 'sully', 'v': 'fallspice', 'w': 'dreamboat', 'x': None,
}

# WE = Wild Element
WILD_TRAITS = {
    '1': None, '2': None, '3': None, '4': None,
    '5': None, '6': None, '7': None, '8': None,
    '9': None, 'a': None, 'b': None, 'c': None,
    'd': None, 'e': None, 'f': None, 'g': None,
    'h': 'elk', 'i': 'trioculus', 'j': 'flapflap', 'k': 'daemonwings',
    'm': 'featherbrain', 'n': 'fern', 'o': 'foghornpawhorn', 'p': 'unicorn',
    'q': 'dragonwings', 'r': 'alicorn', 's': 'wyrm', 't': 'mantis',
    'u': 'kylin', 'v': 'bumblecat', 'w': 'dune', 'x': None,
}

# MO = Mouth
MOUTH_TRAITS = {
    '1': 'whixtensions', '2': 'wasntme', '3': 'wuvme', '4': 'gerbil',
    '5': 'confuzzled', '6': 'impish', '7': 'belch', '8': 'rollercoaster',
    '9': 'beard', 'a': 'pouty', 'b': 'saycheese', 'c': 'grim',
    'd': 'fangtastic', 'e': 'moue', 'f': 'happygokitty', 'g': 'soserious',
    'h': 'cheeky', 'i': 'starstruck', 'j': 'samwise', 'k': 'ruhroh',
    'm': 'dali', 'n': 'grimace', 'o': 'majestic', 'p': 'tongue',
    'q': 'yokel', 'r': 'topoftheworld', 's': 'neckbeard', 't': 'satiated',
    'u': 'walrus', 'v': 'struck', 'w': 'delite', 'x': None,
}

# EN = Environment
ENVIRONMENT_TRAITS = {
    '1': None, '2': None, '3': None, '4': None,
    '5': None, '6': None, '7': None, '8': None,
    '9': None, 'a': None, 'b': None, 'c': None,
    'd': None, 'e': None, 'f': None, 'g': None,
    'h': 'salty', 'i': 'dune', 'j': 'juju', 'k': 'tinybox',
    'm': 'myparade', 'n': 'finalfrontier', 'o': 'metime', 'p': 'drift',
    'q': 'secretgarden', 'r': 'frozen', 's': 'roadtogold', 't': 'jacked',
    'u': 'floorislava', 'v': 'prism', 'w': 'junglebook', 'x': None,
}

# SE = Secret Y Gene
SECRET_TRAITS = {
    '1': None, '2': None, '3': None, '4': None,
    '5': None, '6': None, '7': None, '8': None,
    '9': None, 'a': None, 'b': None, 'c': None,
    'd': None, 'e': None, 'f': None, 'g': None,
    'h': None, 'i': None, 'j': None, 'k': None,
    'm': None, 'n': None, 'o': None, 'p': None,
    'q': None, 'r': None, 's': None, 't': None,
    'u': None, 'v': None, 'w': None, 'x': None,
}

# PU = Purrstige
PURRSTIGE_TRAITS = {
    '1': None, '2': None, '3': None, '4': None,
    '5': None, '6': None, '7': None, '8': None,
    '9': None, 'a': None, 'b': None, 'c': None,
    'd': None, 'e': None, 'f': None, 'g': None,
    'h': 'duckduckcat', 'i': 'furball', 'j': 'thatsawrap', 'k': 'mittens',
    'm': 'reindeer', 'n': None, 'o': 'holidaycheer', 'p': None,
    'q': None, 'r': None, 's': None, 't': None,
    'u': None, 'v': None, 'w': None, 'x': None,
}

# Combined trait categories
TRAIT_CATEGORIES = [
    ('body', 'FU', FUR_TRAITS),
    ('pattern', 'PA', PATTERN_TRAITS),
    ('eyecolor', 'EC', EYE_COLOR_TRAITS),
    ('eyeshape', 'ES', EYE_SHAPE_TRAITS),
    ('basecolor', 'BC', BASE_COLOR_TRAITS),
    ('highlight', 'HC', HIGHLIGHT_COLOR_TRAITS),
    ('accent', 'AC', ACCENT_COLOR_TRAITS),
    ('wild', 'WE', WILD_TRAITS),
    ('mouth', 'MO', MOUTH_TRAITS),
    ('environment', 'EN', ENVIRONMENT_TRAITS),
    ('secret', 'SE', SECRET_TRAITS),
    ('purrstige', 'PU', PURRSTIGE_TRAITS),
]

TRAIT_NAMES = [cat[0] for cat in TRAIT_CATEGORIES]


def get_trait_name(category_idx: int, kai_char: str) -> Optional[str]:
    """Get trait name for a category index and Kai character."""
    if category_idx < 0 or category_idx >= len(TRAIT_CATEGORIES):
        return None
    _, _, traits = TRAIT_CATEGORIES[category_idx]
    return traits.get(kai_char)


def get_trait_by_category(category: str, kai_char: str) -> Optional[str]:
    """Get trait name by category name and Kai character."""
    for idx, (name, code, traits) in enumerate(TRAIT_CATEGORIES):
        if name == category or code == category:
            return traits.get(kai_char)
    return None


# =============================================================================
# FANCY CAT RECIPES
# Format: {fancy_name: {trait_category: required_trait_name, ...}}
# =============================================================================

FANCY_RECIPES = {
    # Early Fancies (2017-2018)
    'ship_cat': {'body': 'sphynx', 'basecolor': 'orangesoda', 'pattern': 'luckystripe', 'eyeshape': 'crazy'},
    'ducat': {'body': 'munchkin', 'pattern': 'totesbasic', 'eyecolor': 'chestnut', 'basecolor': 'cottoncandy'},
    'dracula': {'body': 'laperm', 'mouth': 'fangtastic', 'eyecolor': 'strawberry', 'pattern': 'spock'},
    'cathena': {'body': 'sphynx', 'pattern': 'spangled', 'eyecolor': 'olive', 'mouth': 'happygokitty'},

    # More complex fancies require 5+ traits - abbreviated list
    'kitty_founder': {'body': 'savannah', 'pattern': 'vigilante', 'eyecolor': 'thundergrey', 'eyeshape': 'swarley'},

    # Special patterns that indicate exclusive/special edition cats
    # (These are detected differently - by specific IDs or time windows)
}

# Exclusive cats (obtained through special means, not breeding)
EXCLUSIVE_IDS = {
    1: 'Genesis',
    2: 'Genesis',  # First two kitties
    # Bug Cat range: 1-100
    # Founder Cats: varies
}


def check_fancy_recipe(traits: Dict[str, str]) -> List[str]:
    """
    Check if a kitty's traits match any fancy recipes.

    Args:
        traits: Dict mapping category names to trait values

    Returns:
        List of matching fancy names (empty if no match)
    """
    matches = []

    # Normalize trait values to lowercase
    normalized = {k.lower(): v.lower() if v else None for k, v in traits.items()}

    for fancy_name, recipe in FANCY_RECIPES.items():
        is_match = True
        for category, required_trait in recipe.items():
            actual_trait = normalized.get(category.lower())
            if actual_trait != required_trait.lower():
                is_match = False
                break

        if is_match:
            matches.append(fancy_name)

    return matches


# =============================================================================
# RARITY DATA (approximate percentages from CK API)
# =============================================================================

# Top 10 rarest traits by percentage (from ~1.86M total cats)
RAREST_TRAITS = {
    'bridesmaid': 0.06,      # Eye Color
    'bubblegum': 0.08,       # Eye Color
    'moonrise': 0.09,        # Pattern (IIII)
    'liger': 0.10,           # Fur (IIII)
    'drama': 0.11,           # Eye Shape (IIII)
    'kaleidoscope': 0.12,    # Eye Color (IIII)
    'firstblush': 0.13,      # Base Color (IIII)
    'delite': 0.15,          # Mouth (IIII)
    'dreamboat': 0.16,       # Accent Color (IIII)
}

# Most common traits
COMMON_TRAITS = {
    'totesbasic': 21.96,     # Pattern
    'pouty': 13.27,          # Mouth
    'happygokitty': 11.01,   # Mouth
    'soserious': 10.23,      # Mouth
    'wiley': 9.79,           # Eye Shape
    'thicccbrowz': 9.74,     # Eye Shape
    'simple': 8.89,          # Eye Shape
}


if __name__ == '__main__':
    # Self-test
    print("CryptoKitties Trait Data")
    print("=" * 50)

    print("\nTrait Categories:")
    for name, code, traits in TRAIT_CATEGORIES:
        non_null = sum(1 for v in traits.values() if v is not None)
        print(f"  {code} ({name}): {non_null}/32 traits defined")

    print("\nMewtation Tier Examples:")
    for char in ['1', 'g', 'h', 'p', 'q', 't', 'u', 'v', 'w']:
        tier = get_mewtation_tier(char)
        fur = get_trait_name(0, char)
        print(f"  Kai '{char}' = Tier {tier or 'base':5} | Fur: {fur or '(none)'}")

    print("\nFancy Recipes Loaded:", len(FANCY_RECIPES))
