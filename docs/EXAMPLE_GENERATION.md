# Example Dataset Generation

Commands for generating all example datasets. Run from the `tools/` directory with the venv activated.

## Setup

```bash
cd tools
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install requests
```

---

## Historical Collections

### Dragon (#896775) - 600 ETH Kitty

```bash
# Basic (just Dragon + parents)
python3 ck_fetch.py --ids 896775 -vv --parents 1 --children 0 --out ../dist/example/dragon/dragon.json
python3 download_svgs.py ../dist/example/dragon/dragon.json -o ../dist/example/dragon/svg/ --skip-existing

# Extended (5 levels ancestry, 2 levels children)
python3 ck_fetch.py --ids "896775" -vv --parents 5 --children 2 --child-parent-levels 1 --out ../dist/example/dragon/dragon_extended.json

# Connected only (filtered for shortest-path demos)
python3 filter_connected.py ../dist/example/dragon/dragon_extended.json -o ../dist/example/dragon/dragon_connected.json -v
```

### Founders (#1, #4, #18) - Genesis Cats

```bash
# Basic founders with children
python3 ck_fetch.py --ids "1,4,18" -vv --parents 0 --children 1 --embedded-only --out ../dist/example/founders/founders.json
python3 download_svgs.py ../dist/example/founders/founders.json -o ../dist/example/founders/svg/ --skip-existing

# Extended with more founder cats
python3 ck_fetch.py --ids "1,4,18,100,101,102" -vv --parents 0 --children 1 --out ../dist/example/founders/founders_extended.json

# Connected only (filtered)
python3 filter_connected.py ../dist/example/founders/founders_extended.json -o ../dist/example/founders/founders_connected.json -v
```

### Holidays - Mistletoe & Santa Claws

```bash
python3 ck_fetch.py --ids "174756,275808" -vv --parents 0 --children 1 --embedded-only --out ../dist/example/holidays/holidays.json
python3 download_svgs.py ../dist/example/holidays/holidays.json -o ../dist/example/holidays/svg/ --skip-existing
```

### Milestones - #100k, #500k, etc.

```bash
# Basic milestones
python3 ck_fetch.py --ids "100000,500000" -vv --parents 1 --children 1 --embedded-only --out ../dist/example/milestones/milestones.json
python3 download_svgs.py ../dist/example/milestones/milestones.json -o ../dist/example/milestones/svg/ --skip-existing

# Extended to 1M
python3 ck_fetch.py --ids "100000,200000,300000,400000,500000,600000,700000,800000,900000,1000000" -vv --parents 1 --children 1 --embedded-only --out ../dist/example/milestones/milestones1M.json
```

---

## Rare Mewtations

### Tier IIII (Rarest - liger, moonrise, etc.)

```bash
# Find Tier IIII kitties and save IDs
python3 find_rare_traits.py --tier IIII --limit 10 --ids-file ../dist/example/tier_iiii/tier_iiii_ids.txt

# Fetch with 3 levels of ancestry
python3 ck_fetch.py --ids-file ../dist/example/tier_iiii/tier_iiii_ids.txt -vv --parents 3 --out ../dist/example/tier_iiii/tier_iiii.json
```

### Tier III (Very Rare - lykoi, avatar, etc.)

```bash
python3 find_rare_traits.py --tier III --limit 10 --ids-file ../dist/example/tier_iii/tier_iii_ids.txt
python3 ck_fetch.py --ids-file ../dist/example/tier_iii/tier_iii_ids.txt -vv --parents 3 --out ../dist/example/tier_iii/tier_iii.json
```

### Liger (Single Tier IIII Trait)

```bash
python3 find_rare_traits.py --trait liger --limit 5 --ids-file ../dist/example/liger/liger_ids.txt
python3 ck_fetch.py --ids-file ../dist/example/liger/liger_ids.txt -vv --parents 3 --out ../dist/example/liger/liger.json
```

---

## Diamond Gem Collections

### Diamonds (First Discoverers with Ancestry)

```bash
# Find diamond gem kitties
python3 find_rare_traits.py --diamonds --ids-file ../dist/example/diamonds/diamond_ids.txt

# With 3 levels of ancestry
python3 ck_fetch.py --ids-file ../dist/example/diamonds/diamond_ids.txt -vv --parents 3 --out ../dist/example/diamonds/diamonds.json

# Diamonds only (no ancestry)
python3 ck_fetch.py --ids-file ../dist/example/diamonds/diamond_ids.txt --parents 0 --children 0 --out ../dist/example/diamonds/diamonds_only.json
```

### Gen-0 Diamonds (Gen 0 Trait Discoverers)

Gen 0 cats that were first to discover traits - highly valuable collectibles.

```bash
# Step 1: Get IDs via API search
curl "https://api.cryptokitties.co/v3/kitties?search=gen:0%20mewtation:diamond&limit=50" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(str(k['id']) for k in d.get('kitties',[])))" \
  > ../dist/example/gen0_diamonds/gen0_diamond_ids.txt

# Step 2: Fetch with children (to show offspring)
python3 ck_fetch.py --ids-file ../dist/example/gen0_diamonds/gen0_diamond_ids.txt --parents 0 --children 2 -v --out ../dist/example/gen0_diamonds/gen0_diamonds.json
python3 download_svgs.py ../dist/example/gen0_diamonds/gen0_diamonds.json -o ../dist/example/gen0_diamonds/svg/ --skip-existing
```

---

## Celebrity/Exclusive Collections

### Exclusives (Celebrity Cats)

IDs extracted from kittyverse data (Genesis, Vulcat, CZ, Lil Bub, etc.)

```bash
# Step 1: Extract IDs from kittyverse exclusives.json
python3 -c "
import json
d = json.load(open('data/kittyverse/exclusives.json'))
ids = [i for k,v in d.items() for i in v.get('exclusive',{}).get('ids',[])]
print('\n'.join(map(str, ids)))
" > ../dist/example/exclusives/exclusive_ids.txt

# Step 2: Fetch all exclusives
python3 ck_fetch.py --ids-file ../dist/example/exclusives/exclusive_ids.txt --parents 0 --children 0 -v --out ../dist/example/exclusives/exclusives.json
python3 download_svgs.py ../dist/example/exclusives/exclusives.json -o ../dist/example/exclusives/svg/ --skip-existing
```

---

## Fancy Cats (Bred from Recipes)

Fancy cats don't have pre-assigned IDs - they're bred from specific trait combinations.

```bash
# Step 1: Search API for fancy cats
curl "https://api.cryptokitties.co/v3/kitties?search=type:fancy&limit=50" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(str(k['id']) for k in d.get('kitties',[])))" \
  > ../dist/example/fancies/fancy_ids.txt

# Step 2: Fetch with parents (to show breeding)
python3 ck_fetch.py --ids-file ../dist/example/fancies/fancy_ids.txt --parents 1 --children 0 -v --out ../dist/example/fancies/fancies.json
python3 download_svgs.py ../dist/example/fancies/fancies.json -o ../dist/example/fancies/svg/ --skip-existing
```

### Search for Specific Fancy Types

```bash
# Search for Dracula fancies
curl "https://api.cryptokitties.co/v3/kitties?search=fancy:Dracula&limit=10"

# Search for DuCat fancies
curl "https://api.cryptokitties.co/v3/kitties?search=fancy:DuCat&limit=10"
```

---

## Purrstige Cats (Time-Limited Recipes)

Purrstige cats are bred during specific time windows with special trait combinations.

```bash
# Step 1: Search API for purrstige cats
curl "https://api.cryptokitties.co/v3/kitties?search=type:purrstige&limit=50" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(str(k['id']) for k in d.get('kitties',[])))" \
  > ../dist/example/purrstiges/purrstige_ids.txt

# Step 2: Fetch with parents
python3 ck_fetch.py --ids-file ../dist/example/purrstiges/purrstige_ids.txt --parents 1 --children 0 -v --out ../dist/example/purrstiges/purrstiges.json
python3 download_svgs.py ../dist/example/purrstiges/purrstiges.json -o ../dist/example/purrstiges/svg/ --skip-existing
```

---

## Shortest Path Examples

### Holiday Fancies Path (Mistletoe → Santa)

```bash
python3 ck_fetch.py --ids "174756,275808" --parents 10 -v --out ../dist/example/shortest_path/holiday_fancies.json
```

### Cross-Collection Path (Nivs → Dragon)

```bash
OUT=../dist/example/shortest_path

# Combine your kitty IDs with Dragon
{
  cat ../dist/example/nivs/nivs_kitty_ids.txt
  echo "896775"
} | sort -u > $OUT/nivs_plus_dragon_ids.txt

# Fetch with deep ancestry
python3 ck_fetch.py --ids-file $OUT/nivs_plus_dragon_ids.txt --parents 20 -v --out $OUT/nivs_plus_dragon.json
```

See [SHORTEST_PATH.md](./SHORTEST_PATH.md) for detailed path-finding workflows.

---

## Personal Collection (nivs)

### Basic Collection

```bash
# Root kitties only
python3 ck_fetch.py --ids-file ../dist/example/nivs/nivs_kitty_ids.txt -vv --parents 0 --children 0 --out ../dist/example/nivs/nivs.json
python3 download_svgs.py ../dist/example/nivs/nivs.json -o ../dist/example/nivs/svg/ --skip-existing
```

### Full Ancestry

```bash
# Full parents (30 levels)
python3 ck_fetch.py --ids-file ../dist/example/nivs/nivs_kitty_ids.txt -vv --parents 30 --children 0 --out ../dist/example/nivs/nivs_full_parents.json

# With one level of children
python3 ck_fetch.py --ids-file ../dist/example/nivs/nivs_kitty_ids.txt -vv --parents 30 --children 1 --out ../dist/example/nivs/nivs_full_parents_plus_one_child.json
```

### Pruned Lineage Views

```bash
# Shortest path to Gen 0
python3 prune_to_ancestors.py ../dist/example/nivs/nivs_full_parents.json --shortest -o ../dist/example/nivs/nivs_shortest_path.json

# Matron line only
python3 prune_to_ancestors.py ../dist/example/nivs/nivs_full_parents.json --matron -o ../dist/example/nivs/nivs_matron_line.json

# Sire line only
python3 prune_to_ancestors.py ../dist/example/nivs/nivs_full_parents.json --sire -o ../dist/example/nivs/nivs_sire_line.json
```

---

## Utility Commands

### Filter to Connected Nodes

Remove disconnected nodes from a dataset (useful for shortest-path demos):

```bash
python3 filter_connected.py input.json -o output.json -v
```

### Download SVGs for Any Dataset

```bash
python3 download_svgs.py dataset.json -o ./svg/ --skip-existing
```

---

## API Search Reference

The CryptoKitties API supports search queries:

```bash
# By type
curl "https://api.cryptokitties.co/v3/kitties?search=type:fancy&limit=50"
curl "https://api.cryptokitties.co/v3/kitties?search=type:purrstige&limit=50"

# By specific fancy
curl "https://api.cryptokitties.co/v3/kitties?search=fancy:Dracula&limit=10"

# By generation and mewtation
curl "https://api.cryptokitties.co/v3/kitties?search=gen:0%20mewtation:diamond&limit=50"

# By trait
curl "https://api.cryptokitties.co/v3/kitties?search=body:liger&limit=10"

# By parent
curl "https://api.cryptokitties.co/v3/kitties?parent=1&limit=20"
```

---

## Data Sources

- **KittyVerse data**: `tools/data/kittyverse/` - Static datasets from [cryptocopycats/kitties](https://github.com/cryptocopycats/kitties) (CC0-1.0 license)
- **CryptoKitties API**: `https://api.cryptokitties.co/v3/`
