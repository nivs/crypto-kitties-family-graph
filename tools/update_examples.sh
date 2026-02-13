#!/bin/bash
# Update examples configuration and regenerate documentation
#
# Usage:
#   ./update_examples.sh [--remove-missing]
#
# Options:
#   --remove-missing  Remove config entries for files that no longer exist

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REMOVE_MISSING=""
if [[ "$1" == "--remove-missing" ]]; then
  REMOVE_MISSING="--remove-missing"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Scanning for changes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Run sync in dry-run mode to detect changes
DRY_RUN_OUTPUT=$(python3 sync_examples_config.py $REMOVE_MISSING --dry-run 2>&1)
echo "$DRY_RUN_OUTPUT"

# Check if there are changes to add or remove
FILES_TO_ADD=$(echo "$DRY_RUN_OUTPUT" | grep -E "^Files to add" | grep -oE '\([0-9]+\)' | tr -d '()' || true)
FILES_TO_REMOVE=$(echo "$DRY_RUN_OUTPUT" | grep -E "^Files to remove" | grep -oE '\([0-9]+\)' | tr -d '()' || true)

# Default to 0 if empty
FILES_TO_ADD=${FILES_TO_ADD:-0}
FILES_TO_REMOVE=${FILES_TO_REMOVE:-0}

# If no changes, skip to regeneration
if [[ "$FILES_TO_ADD" == "0" && "$FILES_TO_REMOVE" == "0" ]]; then
  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Step 2: Regenerating documentation..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo
  python3 generate_examples_md.py
  echo
  echo "✓ Documentation is up to date"
  exit 0
fi

# Changes detected - warn and prompt
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  CHANGES DETECTED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$FILES_TO_ADD" != "0" ]]; then
  echo "  • $FILES_TO_ADD file(s) will be ADDED to config"
fi

if [[ "$FILES_TO_REMOVE" != "0" ]]; then
  echo "  • $FILES_TO_REMOVE file(s) will be REMOVED from config"
fi

echo
echo "New files will be added with basic labels like:"
echo "  'View (filename.json)'"
echo
echo "You may want to manually edit the config after this to:"
echo "  • Add meaningful variation labels"
echo "  • Update descriptions"
echo "  • Add params for specific views"
echo "  • Reorganize sections"
echo
read -p "Continue and update config? [y/N] " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Run sync for real
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Updating config..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
python3 sync_examples_config.py $REMOVE_MISSING

# Regenerate documentation
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Regenerating documentation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
python3 generate_examples_md.py

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Done!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Modified files:"
echo "  • tools/examples_config.json"
echo "  • docs/EXAMPLES.md"
echo

if [[ "$FILES_TO_ADD" != "0" ]]; then
  echo "⚠️  Next steps:"
  echo "  1. Review and edit tools/examples_config.json"
  echo "  2. Run './update_examples.sh' again to regenerate docs"
  echo "  3. Commit changes"
  echo
fi
