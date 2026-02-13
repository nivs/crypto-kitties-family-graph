# Shortest Path Examples

Example datasets for demonstrating the "Find Shortest Path" feature.

> **Note:** For basic generation commands, see [docs/EXAMPLE_GENERATION.md](../../../docs/EXAMPLE_GENERATION.md). This file contains detailed workflow examples for path-finding.

## How to Generate

Run these commands from the `tools/` directory with the venv activated:

```bash
cd /Users/nivs/Documents/Personal/Projects/crypto-kitties-family-graph/tools
source .venv/bin/activate
```

---

## 1. Dragon's Family (Siblings)

Find Dragon's (#896775) siblings by fetching its parents' other children.

```bash
OUT=../dist/example/shortest_path

# Step 1: Get Dragon's parents (check matron_id and sire_id in output)
curl -s "https://api.cryptokitties.co/v3/kitties/896775" | jq '{id, matron_id: .matron.id, sire_id: .sire.id}' > $OUT/dragon_parents.json

# Step 2: Find siblings (other children of Dragon's parents)
# Replace MATRON_ID and SIRE_ID with values from step 1
curl -s "https://api.cryptokitties.co/v3/kitties?parent=MATRON_ID&limit=20" | jq '.kitties[] | {id, name, generation}' > $OUT/dragon_maternal_siblings.json
curl -s "https://api.cryptokitties.co/v3/kitties?parent=SIRE_ID&limit=20" | jq '.kitties[] | {id, name, generation}' > $OUT/dragon_paternal_siblings.json

# Step 3: Create IDs file with Dragon + siblings (idempotent - overwrites each run)
{
  echo "896775"
  jq -r '.id' $OUT/dragon_maternal_siblings.json
  jq -r '.id' $OUT/dragon_paternal_siblings.json
} | sort -u > $OUT/dragon_siblings_ids.txt

# Step 4: Generate full dataset from IDs file
python3 ck_fetch.py --ids-file $OUT/dragon_siblings_ids.txt --parents 2 -v --out $OUT/dragon_siblings.json
```

**Visualizer URL (after generating):**
[Dragon → Sibling #2025731](https://ck.innerlogics.com/?dataUrl=./example/shortest_path/dragon_siblings.json&pathFrom=896775&pathTo=2025731)

---

## 2. Famous Founders' Offspring

Check which famous Gen 0 cats have children, then find paths between their descendants.

```bash
OUT=../dist/example/shortest_path

# Check children counts for famous founders
for id in 2 3 4 5 10 18 20 50 100; do
  count=$(curl -s "https://api.cryptokitties.co/v3/kitties?parent=$id&limit=1" | jq '.total // 0')
  echo "Kitty #$id: $count children"
done > $OUT/founder_children_counts.txt

# Find children of two prolific founders (replace with IDs that have children)
curl -s "https://api.cryptokitties.co/v3/kitties?parent=4&limit=10" | jq '.kitties[] | {id, name, generation}' > $OUT/kitty4_children.json
curl -s "https://api.cryptokitties.co/v3/kitties?parent=18&limit=10" | jq '.kitties[] | {id, name, generation}' > $OUT/kitty18_children.json

# Generate dataset: descendants of #4 and #18, see if they connect
python3 ck_fetch.py --ids "4,18" --children 2 --parents 1 -v --out $OUT/founders_descendants.json
```

---

## 3. Holiday Fancies - Mistletoe & Santa Connection

Check if the first Mistletoe (#174756) and first Santa Claws (#275808) share ancestry.

```bash
OUT=../dist/example/shortest_path

# Fetch both with deep parent history
python3 ck_fetch.py --ids "174756,275808" --parents 10 -v --out $OUT/holiday_fancies.json

# Check for common ancestors
python3 -c "
import json
with open('$OUT/holiday_fancies.json') as f:
    data = json.load(f)

# Build ancestor sets
def get_ancestors(kitties, root_id):
    ancestors = set()
    queue = [root_id]
    kitty_map = {k['id']: k for k in kitties}
    while queue:
        kid = queue.pop(0)
        if kid in kitty_map:
            k = kitty_map[kid]
            if k.get('matron_id'):
                ancestors.add(k['matron_id'])
                queue.append(k['matron_id'])
            if k.get('sire_id'):
                ancestors.add(k['sire_id'])
                queue.append(k['sire_id'])
    return ancestors

mistletoe_ancestors = get_ancestors(data['kitties'], 174756)
santa_ancestors = get_ancestors(data['kitties'], 275808)
common = mistletoe_ancestors & santa_ancestors

print(f'Mistletoe ancestors: {len(mistletoe_ancestors)}')
print(f'Santa ancestors: {len(santa_ancestors)}')
print(f'Common ancestors: {len(common)}')
if common:
    print(f'Common ancestor IDs: {sorted(common)[:10]}...')
"
```

!!!
Mistletoe ancestors: 138
Santa ancestors: 115
Common ancestors: 4
Common ancestor IDs: [15315, 101959, 104301, 110586]...
!!!

**Visualizer URL:**
[Mistletoe → Santa Claws](https://ck.innerlogics.com/?dataUrl=./example/shortest_path/holiday_fancies.json&pathFrom=174756&pathTo=275808)

---

## 4. Your Kitties - Simpatico to Mulberry Path

Path between two of your own cats through their shared ancestry.

```bash
# Already have this data in nivs_full_parents.json, but create focused version
python3 ck_fetch.py --ids "68976,149343" --parents 15 -v --out ../dist/example/shortest_path/nivs_simpatico_mulberry.json
```

**Visualizer URL:**
[Simpatico → Mulberry](https://ck.innerlogics.com/?dataUrl=./example/shortest_path/nivs_simpatico_mulberry.json&pathFrom=68976&pathTo=149343)

---

## 5. Cross-Collection: Your Cats to a Famous Cat

Find if any of your cats share ancestry with Dragon (#896775).

```bash
OUT=../dist/example/shortest_path

# Create combined IDs file: all your kitties + Dragon
{
  cat ../dist/example/nivs/nivs_kitty_ids.txt
  echo "896775"
} | sort -u > $OUT/nivs_plus_dragon_ids.txt

# Fetch all with deep parent history
python3 ck_fetch.py --ids-file $OUT/nivs_plus_dragon_ids.txt --parents 20 -v --out $OUT/nivs_plus_dragon.json

# Check which of your cats connect to Dragon
python3 -c "
import json
with open('$OUT/nivs_plus_dragon.json') as f:
    data = json.load(f)

kitty_map = {k['id']: k for k in data['kitties']}

def get_all_ancestors(kid):
    ancestors = set()
    queue = [kid]
    while queue:
        current = queue.pop(0)
        if current in kitty_map:
            k = kitty_map[current]
            for parent_id in [k.get('matron_id'), k.get('sire_id')]:
                if parent_id and parent_id not in ancestors:
                    ancestors.add(parent_id)
                    queue.append(parent_id)
    return ancestors

dragon_ancestors = get_all_ancestors(896775)
print(f'Dragon #896775 ancestors: {len(dragon_ancestors)}')
print()

# Check all your kitties
your_ids = [124653, 129868, 148439, 149343, 236402, 248667, 329987, 58820, 68976, 64752, 4653, 94805, 114618, 20539, 35002]
for kid in your_ids:
    if kid not in kitty_map:
        print(f'#{kid}: not in dataset')
        continue
    ancestors = get_all_ancestors(kid)
    common = ancestors & dragon_ancestors
    name = kitty_map[kid].get('name') or '(unnamed)'
    if common:
        print(f'#{kid} {name}: CONNECTED via {len(common)} common ancestors')
        print(f'  Common: {sorted(common)[:5]}')
    else:
        print(f'#{kid} {name}: not connected ({len(ancestors)} ancestors)')
"
```

Connections found!
```
Dragon #896775 ancestors: 141

#124653 Footer: not connected (464 ancestors)
#129868 Aristocat: not connected (427 ancestors)
#148439 Cat Stevens: not connected (794 ancestors)
#149343 Mulberry: CONNECTED via 1 common ancestors
  Common: [1461]
#236402 Gravy: not connected (794 ancestors)
#248667 Dozer: not connected (667 ancestors)
#329987 Sis: CONNECTED via 1 common ancestors
  Common: [1461]
#58820 Mongo: not connected (306 ancestors)
#68976 Simpatico: not connected (444 ancestors)
#64752 Smelly Tigerpunk Cat: not connected (126 ancestors)
#4653 StrawberryMuffin: not connected (51 ancestors)
#94805 🤠 Ronald-Chartreux!: not connected (56 ancestors)
#114618 (unnamed): CONNECTED via 1 common ancestors
  Common: [1461]
#20539 Cream Chesse Frosting: not connected (228 ancestors)
#35002 CoolCat: not connected (298 ancestors)
```

Interesting - Mulberry and Sis share ancestor #1461 with Dragon. That kitty must be an early breeder whose genes spread widely through the population.

**Visualizer URL (Mulberry connects to Dragon via #1461):**
[Mulberry → Dragon](https://ck.innerlogics.com/?dataUrl=./example/shortest_path/nivs_plus_dragon.json&pathFrom=149343&pathTo=896775)

---

## Quick Reference: Generated Files

| File | Description | Path Demo |
|------|-------------|-----------|
| `dragon_siblings.json` | Dragon + siblings | `pathFrom=896775&pathTo=2025731` |
| `founders_descendants.json` | #4 and #18 family trees | `pathFrom=4&pathTo=18` or descendants |
| `holiday_fancies.json` | Mistletoe + Santa ancestry | `pathFrom=174756&pathTo=275808` |
| `nivs_simpatico_mulberry.json` | Your two cats | `pathFrom=68976&pathTo=149343` |
| `nivs_plus_dragon.json` | All your cats + Dragon | `pathFrom=149343&pathTo=896775` (via #1461) |

---

## Notes

- Path finding works best when kitties share common ancestors
- The more parent levels fetched, the more likely to find connections
- Gen 0 founder cats are often the connection point for unrelated kitties
- Use `--parents 20` or higher for deep ancestry searches
