# Shortest Path Examples

Example datasets for demonstrating the "Find Shortest Path" feature.

Data files are in `dist/examples/shortest_path/`.

## How to Generate

Run these commands from the `tools/` directory with the venv activated:

```bash
cd tools
source .venv/bin/activate
```

---

## 1. Dragon's Family (Siblings)

Find Dragon's (#896775) siblings by fetching its parents' other children.

```bash
OUT=../dist/examples/shortest_path

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
[Dragon → Sibling #2025731](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/dragon_siblings.json&pathFrom=896775&pathTo=2025731)

---

## 2. Famous Founders' Offspring

Check which famous Gen 0 cats have children, then find paths between their descendants.

```bash
OUT=../dist/examples/shortest_path

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
OUT=../dist/examples/shortest_path

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

Common ancestors found:
```
Mistletoe ancestors: 138
Santa ancestors: 115
Common ancestors: 4
Common ancestor IDs: [15315, 101959, 104301, 110586]...
```

**Visualizer URL:**
[Mistletoe → Santa Claws](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/holiday_fancies.json&pathFrom=174756&pathTo=275808)

---

## 4. Your Kitties - Simpatico to Mulberry Path

Path between two of your own cats through their shared ancestry.

```bash
# Already have this data in nivs_full_parents.json, but create focused version
python3 ck_fetch.py --ids "68976,149343" --parents 15 -v --out ../dist/examples/shortest_path/nivs_simpatico_mulberry.json
```

**Visualizer URL:**
[Simpatico → Mulberry](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/nivs_simpatico_mulberry.json&pathFrom=68976&pathTo=149343)

---

## 5. Cross-Collection: Your Cats to a Famous Cat

Find if any of your cats share ancestry with Dragon (#896775).

```bash
OUT=../dist/examples/shortest_path

# Create combined IDs file: all your kitties + Dragon
{
  cat ../dist/examples/nivs/nivs_kitty_ids.txt
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
[Mulberry → Dragon](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/nivs_plus_dragon.json&pathFrom=149343&pathTo=896775)

---

## Quick Reference: Generated Files

| File | Description | Path Demo |
|------|-------------|-----------|
| `dragon_siblings.json` | Dragon + siblings | `pathFrom=896775&pathTo=2025731` |
| `dragon_1461_connection.json` | Dragon's full ancestry tree (142 kitties) | `selected=896775&pathTo=1461` |
| `founders_descendants.json` | #4 and #18 family trees | `pathFrom=4&pathTo=18` or descendants |
| `holiday_fancies.json` | Mistletoe + Santa ancestry | `pathFrom=174756&pathTo=275808` |
| `nivs_simpatico_mulberry.json` | Your two cats | `pathFrom=68976&pathTo=149343` |
| `nivs_plus_dragon.json` | All your cats + Dragon (full, 1034 kitties) | `pathFrom=149343&pathTo=896775` |
| `nivs_dragon_cluster.json` | Distilled: nivs → #1461 → Dragon (34 kitties) | `pathFrom=149343&pathTo=896775` |

---

## 6. Dragon → #1461 Ancestry

**The story:** Dragon (#896775) sold for 600 ETH in September 2018. Trace its ancestry and you'll find kitty #1461 ("PO-838356"), a Gen 0 born December 2, 2017 - four days after CryptoKitties launched.

Nine generations later, #1461's genes are in the most expensive CryptoKitty ever sold.

```bash
cd tools
source .venv/bin/activate

# Fetch Dragon's full ancestry tree
python3 trace_dragon_ancestry.py

# Prune to minimize file size
python3 prune_json.py ../dist/examples/shortest_path/dragon_1461_connection.json -v
```

Output:
```
Fetched 142 ancestors
✓ #1461 found in Dragon's ancestry!

Shortest path (10 generations):
  896775 -> 894625 -> 892412 -> 891975 -> 888532 -> 888385 -> 885311 -> 842791 -> 770170 -> 1461

By generation: {0: 56, 1: 29, 2: 16, 3: 10, 4: 10, 5: 8, 6: 6, 7: 4, 8: 2, 9: 1}
```

**Visualizer URLs:**
- [Dragon's ancestry tree](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/dragon_1461_connection.json&selected=896775)
- [Highlight path to #1461](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/dragon_1461_connection.json&selected=896775&shortestPath=true&pathTo=1461)
- [3D view](https://ck.innerlogics.com/3d.html?dataUrl=./examples/shortest_path/dragon_1461_connection.json&selected=896775)

---

## 7. Nivs → Dragon Cluster (Distilled)

**The story:** Your kitties Mulberry (#149343) and Sis (#329987) share a common ancestor with Dragon (#896775) - the Gen 0 kitty #1461 ("PO-838356").

This distilled dataset (34 kitties) shows just the connection paths without the noise of full ancestry trees (vs 1034 in the full dataset).

**Paths:**
- Dragon → #1461: 10 generations
- Mulberry → #1461: 7 generations
- Sis → #1461: 8 generations (Sis is Mulberry's child)

```bash
cd tools
source .venv/bin/activate

# Extract paths from existing full dataset (requires nivs_plus_dragon.json)
python3 -c "
import json
from collections import deque

with open('../dist/examples/shortest_path/nivs_plus_dragon.json') as f:
    data = json.load(f)

kitty_map = {k['id']: k for k in data['kitties']}
your_ids = [124653, 129868, 148439, 149343, 236402, 248667, 329987, 58820, 68976]

def get_path_to_ancestor(start, target):
    queue = deque([(start, [start])])
    visited = {start}
    while queue:
        current, path = queue.popleft()
        if current == target:
            return path
        if current not in kitty_map:
            continue
        k = kitty_map[current]
        for parent_id in [k.get('matron_id'), k.get('sire_id')]:
            if parent_id and parent_id not in visited:
                visited.add(parent_id)
                queue.append((parent_id, path + [parent_id]))
    return None

include_ids = set(your_ids)
for kid in [896775, 149343, 329987]:
    path = get_path_to_ancestor(kid, 1461)
    if path:
        include_ids.update(path)

# Add parents for cluster context
for kid in your_ids:
    if kid in kitty_map:
        k = kitty_map[kid]
        for parent_id in [k.get('matron_id'), k.get('sire_id')]:
            if parent_id and parent_id in kitty_map:
                include_ids.add(parent_id)

output = {
    'root_ids': your_ids + [896775],
    'notable_ancestor': 1461,
    'kitties': [k for k in data['kitties'] if k['id'] in include_ids]
}

with open('../dist/examples/shortest_path/nivs_dragon_cluster.json', 'w') as f:
    json.dump(output, f, indent=2)
print(f'Wrote {len(output[\"kitties\"])} kitties')
"

# Prune to minimize size
python3 prune_json.py ../dist/examples/shortest_path/nivs_dragon_cluster.json -v
```

**Visualizer URLs:**
- [Full cluster](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/nivs_dragon_cluster.json)
- [Mulberry → Dragon](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/nivs_dragon_cluster.json&pathFrom=149343&pathTo=896775)
- [Sis → Dragon](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/nivs_dragon_cluster.json&pathFrom=329987&pathTo=896775)
- [Focus on #1461](https://ck.innerlogics.com/?dataUrl=./examples/shortest_path/nivs_dragon_cluster.json&selected=1461)

---

## Tools Reference

| Script | Purpose |
|--------|---------|
| `find_shortest_path.py` | Find shortest path between two groups of kitties (bidirectional BFS) |
| `trace_dragon_ancestry.py` | Fetch Dragon's full ancestry tree, highlight #1461 |
| `prune_json.py` | Remove unused fields from kitty data (90%+ size reduction) |
| `prune_to_ancestors.py` | Filter to only ancestor kitties of root IDs |
| `ck_fetch.py` | Fetch kitties with configurable parent/child depth |

### find_shortest_path.py

```bash
# Between two kitty IDs
python3 find_shortest_path.py --from-ids 1461,896775 --to-ids 50,1003

# From IDs to an existing JSON file
python3 find_shortest_path.py --from-ids 1461,896775 --to-json holiday_fancies.json

# Between two JSON files
python3 find_shortest_path.py --from-json group_a.json --to-json group_b.json

# Export the connected graph
python3 find_shortest_path.py --from-ids 1461 --to-json holiday_fancies.json --out connected.json -v
```

Options:
- `--max-depth N` - Maximum generations to search (default: 50)
- `-v` / `-vv` - Verbose output

---

## Notes

- Path finding works best when kitties share common ancestors
- The more parent levels fetched, the more likely to find connections
- Gen 0 founder cats are often the connection point for unrelated kitties
- Use `--parents 20` or higher for deep ancestry searches
