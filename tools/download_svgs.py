#!/usr/bin/env python3
"""
Download kitty images (SVG or PNG) from a JSON file.

Usage:
    python3 download_svgs.py kitties.json -o ./images/
    python3 download_svgs.py kitties.json -o ./images/ --skip-existing
"""

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError


def load_kitties(json_path: str) -> list[dict]:
    """Load kitties from JSON file."""
    with open(json_path, "r") as f:
        data = json.load(f)

    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "kitties" in data:
        return data["kitties"]

    raise ValueError("JSON must be a list or contain a 'kitties' array")


def get_image_url(kitty: dict) -> str | None:
    """Extract image URL from kitty object."""
    for field in ["image_url", "imageUrl", "image_url_cdn", "imageUrlCdn", "image"]:
        if field in kitty and kitty[field]:
            return kitty[field]
    return None


def detect_format(url: str, content: bytes, content_type: str | None) -> str:
    """Detect image format from URL, content-type, or content."""
    # Check URL extension
    url_lower = url.lower()
    if ".svg" in url_lower:
        return "svg"
    if ".png" in url_lower:
        return "png"

    # Check content-type header
    if content_type:
        ct = content_type.lower()
        if "svg" in ct:
            return "svg"
        if "png" in ct:
            return "png"

    # Check content magic bytes
    if content.startswith(b"\x89PNG"):
        return "png"
    if content.strip().startswith(b"<"):
        return "svg"

    # Default to svg
    return "svg"


def download_image(url: str, output_dir: Path, kitty_id: int, timeout: int = 30) -> tuple[bool, str | None]:
    """Download image from URL. Returns (success, extension)."""
    try:
        req = Request(url, headers={"User-Agent": "CK-Image-Downloader/1.0"})
        with urlopen(req, timeout=timeout) as response:
            content = response.read()
            content_type = response.headers.get("Content-Type")

            ext = detect_format(url, content, content_type)
            output_path = output_dir / f"{kitty_id}.{ext}"

            output_dir.mkdir(parents=True, exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(content)

            return True, ext

    except HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        return False, None
    except URLError as e:
        print(f"URL Error: {e.reason}")
        return False, None
    except Exception as e:
        print(f"Error: {e}")
        return False, None


def find_existing(output_dir: Path, kitty_id: int) -> Path | None:
    """Check if image already exists (any extension)."""
    for ext in ["svg", "png"]:
        path = output_dir / f"{kitty_id}.{ext}"
        if path.exists():
            return path
    return None


def main():
    parser = argparse.ArgumentParser(
        description="Download kitty images (SVG/PNG) from a JSON file"
    )
    parser.add_argument("json_file", help="JSON file with kitty data")
    parser.add_argument(
        "-o", "--output",
        default="./images",
        help="Output directory (default: ./images)"
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip download if file already exists (any format)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay between downloads in seconds (default: 0.5)"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output"
    )

    args = parser.parse_args()

    try:
        kitties = load_kitties(args.json_file)
    except Exception as e:
        print(f"Error loading JSON: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(kitties)} kitties in {args.json_file}")

    output_dir = Path(args.output)
    downloaded = 0
    skipped = 0
    failed = 0
    no_url = 0

    for kitty in kitties:
        kitty_id = kitty.get("id")
        if not kitty_id:
            continue

        image_url = get_image_url(kitty)
        if not image_url:
            if args.verbose:
                print(f"  #{kitty_id}: No image URL")
            no_url += 1
            continue

        if args.skip_existing:
            existing = find_existing(output_dir, kitty_id)
            if existing:
                if args.verbose:
                    print(f"  #{kitty_id}: Skipping (exists: {existing.suffix})")
                skipped += 1
                continue

        print(f"  #{kitty_id}: Downloading...", end=" ", flush=True)

        success, ext = download_image(image_url, output_dir, kitty_id)
        if success:
            print(f"OK ({ext})")
            downloaded += 1
        else:
            failed += 1

        if args.delay > 0:
            time.sleep(args.delay)

    print()
    print(f"Done: {downloaded} downloaded, {skipped} skipped, {failed} failed, {no_url} no URL")


if __name__ == "__main__":
    main()
