# Notable Kitties - Example Datasets

Live website: [ck.innerlogics.com](https://ck.innerlogics.com)

Example datasets are in `dist/example/` for testing and demonstrating the analysis tools.

## Quick Links

### Rare Mewtations (Tier II-IIII)

| Dataset | Kitties | View | Filters |
|---------|---------|------|---------|
| **Tier IIII** (liger, moonrise) | 158 | [View](https://ck.innerlogics.com/?dataUrl=./example/tier_iiii/tier_iiii.json) | [Diamond gems only](https://ck.innerlogics.com/?dataUrl=./example/tier_iiii/tier_iiii.json&mewtations=diamond) |
| **Tier III** (lykoi, avatar) | 139 | [View](https://ck.innerlogics.com/?dataUrl=./example/tier_iii/tier_iii.json) | [Gold+ gems](https://ck.innerlogics.com/?dataUrl=./example/tier_iii/tier_iii.json&mewtations=diamond,gold) |
| **Diamonds** (first discoverers) | 150 | [View](https://ck.innerlogics.com/?dataUrl=./example/diamonds/diamonds.json) | [All gems](https://ck.innerlogics.com/?dataUrl=./example/diamonds/diamonds.json&mewtations=all&filterEdges=true) |
| **Liger** (single IIII trait) | 92 | [View](https://ck.innerlogics.com/?dataUrl=./example/liger/liger.json) | |

### Historical Collections

| Dataset | Kitties | View (cached) | View (API) |
|---------|---------|---------------|------------|
| **Dragon** (600 ETH kitty) | 3 | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/dragon/dragon.json&svgBaseUrl=./example/dragon/svg/) | [API](https://ck.innerlogics.com/?kitties=896775) |
| **Dragon Extended** | 35 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/dragon/dragon_extended.json) | |
| **Founders** (#1, #4, #18) | 10 | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/founders/founders.json&svgBaseUrl=./example/founders/svg/) | [API](https://ck.innerlogics.com/?kitties=1,4,18) |
| **Founders Extended** | 26 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/founders/founders_extended.json) | |
| **Holidays** (Mistletoe, Santa) | 13 | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/holidays/holidays.json&svgBaseUrl=./example/holidays/svg/) | [API](https://ck.innerlogics.com/?kitties=174756,275808) |
| **Milestones** (#100k, #500k) | 15 | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/milestones/milestones.json&svgBaseUrl=./example/milestones/svg/) | [API](https://ck.innerlogics.com/?kitties=100000,500000) |
| **Milestones 1M** | 43 | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/milestones/milestones1M.json&svgBaseUrl=./example/milestones/svg/) | |

### Personal Collection (nivs)

| Dataset | Kitties | View |
|---------|---------|------|
| **Root Kitties** | 15 | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs.json&svgBaseUrl=./example/nivs/svg/&owner=nivs) |
| **Full Parents** | 878 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_full_parents.json&owner=nivs) ・ [Gen 0-5](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_full_parents.json&owner=nivs&genMin=0&genMax=5) |
| **Full + Children** | 894 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_full_parents_plus_one_child.json&owner=nivs) |
| **Matron Line** | 70 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_matron_line.json&owner=nivs) |
| **Sire Line** | 51 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_sire_line.json&owner=nivs) |
| **Shortest Path** | 55 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_shortest_path.json&owner=nivs) |

### Shortest Path Examples

See [SHORTEST_PATH.md](./SHORTEST_PATH.md) for detailed examples.

| Dataset | Description | View |
|---------|-------------|------|
| **Holiday Fancies** | Mistletoe → Santa Claws path | [View path](https://ck.innerlogics.com/?dataUrl=./example/shortest_path/holiday_fancies.json&pathFrom=174756&pathTo=275808) |
| **Nivs + Dragon** | Personal cats connecting to Dragon | [View path](https://ck.innerlogics.com/?dataUrl=./example/shortest_path/nivs_plus_dragon.json&pathFrom=149343&pathTo=896775) |
| **Dragon Siblings** | Dragon's family connections | [View](https://ck.innerlogics.com/?dataUrl=./example/shortest_path/dragon_siblings.json) |

---

## URL Parameters Reference

| Parameter | Description | Example |
|-----------|-------------|---------|
| `dataUrl` | Load from cached JSON file | `?dataUrl=./example/dragon/dragon.json` |
| `svgBaseUrl` | Base URL for local SVG images | `&svgBaseUrl=./example/dragon/svg/` |
| `owner` | Pin owner highlight | `&owner=nivs` or `&owner=0x1234...` |
| `genMin` / `genMax` | Filter by generation range | `&genMin=0&genMax=10` |
| `mewtations` | Filter by gem type | `&mewtations=diamond,gold` or `&mewtations=all` |
| `filterEdges` | Highlight edges between filtered kitties | `&filterEdges=true` |
| `noExpand` | Skip embedded parent/child extraction | `&noExpand=true` |
| `pathFrom` / `pathTo` | Highlight shortest path | `&pathFrom=174756&pathTo=275808` |

---

## Tier IIII Kitties (`tier_iiii/`)

**[View in Graph](https://ck.innerlogics.com/?dataUrl=./example/tier_iiii/tier_iiii.json)** ・ [Diamond gems only](https://ck.innerlogics.com/?dataUrl=./example/tier_iiii/tier_iiii.json&mewtations=diamond&filterEdges=true)

The rarest mewtation tier. Only ~0.1% of all CryptoKitties have Tier IIII dominant traits.

**Root Kitties:**
| ID | Name | Gen | Tier IIII Trait | View |
|----|------|-----|-----------------|------|
| 1098467 | #1 Liger (M4) | 8 | body: liger | [API](https://ck.innerlogics.com/?kitties=1098467) |
| 1099023 | Nala Shyhun | 11 | body: liger | [API](https://ck.innerlogics.com/?kitties=1099023) |
| 1099479 | Countess Meowpip | 10 | body: liger | [API](https://ck.innerlogics.com/?kitties=1099479) |
| 1099487 | Liger #4 (M4) | 11 | body: liger | [API](https://ck.innerlogics.com/?kitties=1099487) |
| 1099579 | Thor | 12 | body: liger | [API](https://ck.innerlogics.com/?kitties=1099579) |
| 1158532 | Precious Bobopants | 7 | pattern: moonrise | [API](https://ck.innerlogics.com/?kitties=1158532) |
| 1158639 | Commodore Vileson | 8 | pattern: moonrise | [API](https://ck.innerlogics.com/?kitties=1158639) |
| 1158676 | Master Cootbuncle | 8 | pattern: moonrise | [API](https://ck.innerlogics.com/?kitties=1158676) |
| 1158783 | Kira Cootgwai | 9 | pattern: moonrise | [API](https://ck.innerlogics.com/?kitties=1158783) |
| 1158815 | #5 Moonrise | 11 | pattern: moonrise | [API](https://ck.innerlogics.com/?kitties=1158815) |

**Mewtation Distribution:**
- Tier IIII: 10 (liger, moonrise)
- Tier III: 67 (lykoi, burmilla, avatar, gyre, bornwithit, etc.)
- Tier II: 68 (fox, kurilian, scorpius, etc.)
- Tier I: 103

---

## Tier III Kitties (`tier_iii/`)

**[View in Graph](https://ck.innerlogics.com/?dataUrl=./example/tier_iii/tier_iii.json)** ・ [Gold+ gems](https://ck.innerlogics.com/?dataUrl=./example/tier_iii/tier_iii.json&mewtations=diamond,gold&filterEdges=true)

Very rare mewtations, one tier below the rarest.

**Mewtation Distribution:**
- Tier III: 12 (lykoi, burmilla, avatar, gyre, bornwithit, candyshoppe)
- Tier II: 44
- Tier I: 125

---

## Diamond Gem Kitties (`diamonds/`)

**[View in Graph](https://ck.innerlogics.com/?dataUrl=./example/diamonds/diamonds.json)** ・ [All gems highlighted](https://ck.innerlogics.com/?dataUrl=./example/diamonds/diamonds.json&mewtations=all&filterEdges=true)

Kitties that were the **first to discover** a mewtation trait. These receive a diamond gem badge on CryptoKitties.

**Mewtation Distribution:**
- Tier IIII: 8
- Tier III: 38
- Tier II: 60

---

## Liger Kitties (`liger/`)

**[View in Graph](https://ck.innerlogics.com/?dataUrl=./example/liger/liger.json)**

Focused collection of kitties with the `liger` body trait (Tier IIII).

**Root Kitties:** 5 liger-bodied kitties with 3 levels of ancestry.

**Mewtation Distribution:**
- Tier IIII: 5 (all liger body)
- Tier III: 28
- Tier II: 41

---

## Dragon Kitty (`dragon/`)

**[View in Graph (cached + SVGs)](https://ck.innerlogics.com/?dataUrl=./example/dragon/dragon.json&svgBaseUrl=./example/dragon/svg/)** ・ [API](https://ck.innerlogics.com/?kitties=896775)

Kitty #896775 - Sold for 600 ETH (~$170k at the time), the most expensive CryptoKitty ever.

| File | Description | View |
|------|-------------|------|
| dragon.json | Original 3 kitties | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/dragon/dragon.json&svgBaseUrl=./example/dragon/svg/) |
| dragon_extended.json | Extended with 5 levels of ancestry | [Cached](https://ck.innerlogics.com/?dataUrl=./example/dragon/dragon_extended.json) |

**Notable traits:** dragonwings (wild), secretgarden (environment)

---

## Founders (`founders/`)

**[View in Graph (cached + SVGs)](https://ck.innerlogics.com/?dataUrl=./example/founders/founders.json&svgBaseUrl=./example/founders/svg/)** ・ [API](https://ck.innerlogics.com/?kitties=1,4,18)

The original CryptoKitties founders.

| File | Description | View |
|------|-------------|------|
| founders.json | Genesis (#1), Fluffy (#4), #18 with children | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/founders/founders.json&svgBaseUrl=./example/founders/svg/) |
| founders_extended.json | Extended with more founder cats | [Cached](https://ck.innerlogics.com/?dataUrl=./example/founders/founders_extended.json) |

**Root Kitties:**
- #1 Genesis - The first CryptoKitty ever ([View](https://ck.innerlogics.com/?kitties=1))
- #4 Fluffy Founder ([View](https://ck.innerlogics.com/?kitties=4))
- #18 Founder Cat ([View](https://ck.innerlogics.com/?kitties=18))

---

## Holidays (`holidays/`)

**[View in Graph (cached + SVGs)](https://ck.innerlogics.com/?dataUrl=./example/holidays/holidays.json&svgBaseUrl=./example/holidays/svg/)** ・ [API](https://ck.innerlogics.com/?kitties=174756,275808)

Christmas and seasonal themed kitties.

**Root Kitties:**
- #174756 First Mistletoe ([View](https://ck.innerlogics.com/?kitties=174756))
- #275808 First SantaClaws ([View](https://ck.innerlogics.com/?kitties=275808))

---

## Milestones (`milestones/`)

**[View in Graph (cached + SVGs)](https://ck.innerlogics.com/?dataUrl=./example/milestones/milestones.json&svgBaseUrl=./example/milestones/svg/)** ・ [API](https://ck.innerlogics.com/?kitties=100000,500000)

Kitties at significant ID milestones.

| File | Description | View |
|------|-------------|------|
| milestones.json | #100000, #200000 with parents/children | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/milestones/milestones.json&svgBaseUrl=./example/milestones/svg/) |
| milestones1M.json | Extended to #1000000 | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/milestones/milestones1M.json&svgBaseUrl=./example/milestones/svg/) |

**Root Kitties:**
- Rudiger (#100000) ([View](https://ck.innerlogics.com/?kitties=100000))
- Cathena (#500000) ([View](https://ck.innerlogics.com/?kitties=500000))

---

## Nivs Collection (`nivs/`)

**[View in Graph (cached + SVGs)](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs.json&svgBaseUrl=./example/nivs/svg/&owner=nivs)**

Personal collection with complete ancestry traced to Gen 0.

| File | Kitties | View |
|------|---------|------|
| nivs.json | 15 | [Cached + SVGs](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs.json&svgBaseUrl=./example/nivs/svg/&owner=nivs) |
| nivs_full_parents.json | 878 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_full_parents.json&owner=nivs) |
| nivs_full_parents_plus_one_child.json | 894 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_full_parents_plus_one_child.json&owner=nivs) |
| nivs_matron_line.json | 70 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_matron_line.json&owner=nivs) |
| nivs_sire_line.json | 51 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_sire_line.json&owner=nivs) |
| nivs_shortest_path.json | 55 | [Cached](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_shortest_path.json&owner=nivs) |

**Filtering examples:**
- [Gen 0-5 only](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_full_parents.json&owner=nivs&genMin=0&genMax=5)
- [All mewtation gems](https://ck.innerlogics.com/?dataUrl=./example/nivs/nivs_full_parents.json&owner=nivs&mewtations=all)

---

## Mewtation Tier Reference

| Tier | Kai | Rarity | Example Traits |
|------|-----|--------|----------------|
| base | 1-g | Common | savannah, tiger, gold, swarley |
| I | h-p | Uncommon | norwegianforest, splat, pumpkin |
| II | q-t | Rare | fox, scorpius, babypuke, dragonwings |
| III | u-v | Very Rare | lykoi, avatar, gemini, bornwithit |
| IIII | w | Rarest | liger, moonrise, kaleidoscope, drama |

---

## Fetching New Data

See [tools/README.md](../tools/README.md) for detailed tool documentation.

```bash
cd tools
source .venv/bin/activate

# Find rare trait kitties
python3 find_rare_traits.py --tier IIII --limit 10 --ids-file rare_ids.txt

# Fetch with ancestry
python3 ck_fetch.py --ids-file rare_ids.txt --parents 3 --out ../dist/example/new_collection/data.json

# Download SVGs
python3 download_svgs.py ../dist/example/new_collection/data.json -o ../dist/example/new_collection/svg/
```
