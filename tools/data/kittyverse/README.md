# KittyVerse Data

Static datasets from [cryptocopycats/kitties](https://github.com/cryptocopycats/kitties) repository.

## Files

| File | Description |
|------|-------------|
| `exclusives.json` | Exclusive/celebrity cats with kitty IDs (e.g., Genesis #1, Vulcat #1000000) |
| `fancies.json` | Fancy cat recipes (trait combinations to breed them) |
| `purrstiges.json` | Purrstige cats and their requirements |
| `special-editions.json` | Special edition cats |
| `traits.json` | Trait definitions and metadata |

## Usage

### Extract Exclusive IDs

```python
import json

with open('exclusives.json') as f:
    data = json.load(f)

all_ids = []
for key, info in data.items():
    ids = info.get('exclusive', {}).get('ids', [])
    all_ids.extend(ids)

print(f'Total exclusive IDs: {len(all_ids)}')  # 319
```

### Fancy Cats

Fancies don't have pre-assigned IDs - they're bred from trait recipes. To find fancy cats:

```bash
# Use the auctions API with search filter
curl "https://api.cryptokitties.co/v3/auctions?search=type:fancy&limit=100"

# Or search for specific fancy type
curl "https://api.cryptokitties.co/v3/auctions?search=fancy:Dracula&limit=10"
```

## Source

Downloaded from: https://github.com/cryptocopycats/kitties

**License:** [CC0-1.0](https://github.com/cryptocopycats/kitties?tab=CC0-1.0-1-ov-file#readme) (Public Domain)

Last updated: April 2021
