#!/usr/bin/env python3
"""
Calculate optimal 2D and 3D viewport parameters for example datasets.

Usage: python3 tools/calculate_viewports.py

Analyzes each linked example and outputs recommended cam2d and cam3d parameters.
"""

import json
import math
import random
from pathlib import Path

EXAMPLES_DIR = Path(__file__).parent.parent / "dist" / "examples"

# Example datasets linked from the examples pane
EXAMPLES = [
    {"name": "Dragon", "file": "dragon/dragon_extended.json", "selected": 896775, "zAxis": "rarity"},
    {"name": "Founders", "file": "founders/founders_children.json", "genMax": 0, "zAxis": "rarity"},
    {"name": "Milestones", "file": "milestones/milestones.json", "zAxis": "rarity"},
    {"name": "Holidays", "file": "holidays/holidays.json", "zAxis": "rarity"},
    {"name": "Fancies", "file": "fancies/fancies.json", "zAxis": "generation"},
    {"name": "Purrstiges", "file": "purrstiges/purrstiges.json", "zAxis": "generation"},
    {"name": "Exclusives", "file": "exclusives/exclusives.json", "zAxis": "generation"},
    {"name": "Tier III", "file": "tier_iii/tier_iii.json", "mewtations": "diamond,gold", "zAxis": "rarity"},
    {"name": "Tier IIII", "file": "tier_iiii/tier_iiii.json", "mewtations": "diamond", "zAxis": "rarity"},
    {"name": "Diamonds", "file": "diamonds/diamonds.json", "mewtations": "all", "zAxis": "rarity"},
    {"name": "Gen-0 Diamonds", "file": "gen0_diamonds/gen0_diamonds.json", "mewtations": "diamond", "zAxis": "rarity"},
    {"name": "Holiday Fancies Path", "file": "shortest_path/holiday_fancies.json", "pathFrom": 174756, "pathTo": 275808, "zAxis": "rarity"},
    {"name": "Dragon Path", "file": "dragon/dragon_connected.json", "selected": 896775, "shortestPath": True, "zAxis": "rarity"},
]


def load_dataset(file_path: str) -> dict | None:
    """Load a JSON dataset file."""
    full_path = EXAMPLES_DIR / file_path
    if not full_path.exists():
        print(f"  File not found: {full_path}")
        return None
    with open(full_path) as f:
        return json.load(f)


def simulate_layout(kitties: list, iterations: int = 100) -> tuple[dict, list]:
    """
    Simple force-directed layout simulation.
    Returns (nodes dict, links list).
    """
    random.seed(42)  # Reproducible results

    nodes = {}
    links = []

    # Create nodes
    for k in kitties:
        node_id = int(k["id"])
        nodes[node_id] = {
            "id": node_id,
            "x": random.uniform(-500, 500),
            "y": random.uniform(-500, 500),
            "vx": 0,
            "vy": 0,
            "generation": k.get("generation", 0),
        }

    # Create links
    for k in kitties:
        node_id = int(k["id"])
        matron_id = k.get("matron_id")
        sire_id = k.get("sire_id")

        if matron_id and int(matron_id) in nodes:
            links.append({"source": int(matron_id), "target": node_id})
        if sire_id and int(sire_id) in nodes:
            links.append({"source": int(sire_id), "target": node_id})

    # Force simulation parameters
    link_distance = 80
    charge_strength = -120
    alpha = 0.3
    decay = 0.02

    for i in range(iterations):
        current_alpha = alpha * ((1 - decay) ** i)
        if current_alpha < 0.001:
            break

        # Charge force (repulsion)
        node_ids = list(nodes.keys())
        for j, id1 in enumerate(node_ids):
            for id2 in node_ids[j + 1:]:
                n1, n2 = nodes[id1], nodes[id2]
                dx = n2["x"] - n1["x"]
                dy = n2["y"] - n1["y"]
                dist = math.sqrt(dx * dx + dy * dy) or 1
                force = charge_strength / (dist * dist) * current_alpha
                fx = (dx / dist) * force
                fy = (dy / dist) * force
                n1["vx"] -= fx
                n1["vy"] -= fy
                n2["vx"] += fx
                n2["vy"] += fy

        # Link force (attraction)
        for link in links:
            source = nodes.get(link["source"])
            target = nodes.get(link["target"])
            if not source or not target:
                continue

            dx = target["x"] - source["x"]
            dy = target["y"] - source["y"]
            dist = math.sqrt(dx * dx + dy * dy) or 1
            force = (dist - link_distance) * 0.1 * current_alpha
            fx = (dx / dist) * force
            fy = (dy / dist) * force
            source["vx"] += fx
            source["vy"] += fy
            target["vx"] -= fx
            target["vy"] -= fy

        # Apply velocities with damping
        for node in nodes.values():
            node["x"] += node["vx"]
            node["y"] += node["vy"]
            node["vx"] *= 0.6
            node["vy"] *= 0.6

    return nodes, links


def get_gem_type(position: int) -> str:
    """Get gem type based on discovery position."""
    if position == 1:
        return "diamond"
    if position <= 10:
        return "gold"
    if position <= 100:
        return "silver"
    return "bronze"


def calculate_z(kitty: dict, all_kitties: list, mode: str, max_z_spread: float) -> float:
    """Calculate Z position based on mode."""
    if mode == "flat":
        return 0

    if mode == "generation":
        gens = [k.get("generation", 0) for k in all_kitties]
        min_gen, max_gen = min(gens), max(gens)
        gen_range = max_gen - min_gen
        if gen_range == 0:
            return 0
        gen = kitty.get("generation", 0)
        return ((max_gen - gen) / gen_range) * max_z_spread

    if mode == "birthday":
        # Simplified - just use generation as proxy
        return calculate_z(kitty, all_kitties, "generation", max_z_spread)

    if mode == "rarity":
        # Check for mewtation gems
        gems = []
        for attr in kitty.get("enhanced_cattributes", []):
            pos = attr.get("position")
            if pos and pos <= 500:
                gems.append({"position": pos, "gem": get_gem_type(pos)})

        if not gems:
            return 0

        best_position = min(g["position"] for g in gems)
        return ((500 - best_position) / 500) * max_z_spread

    return 0


def calculate_quaternion_looking_down():
    """
    Calculate quaternion for camera looking down from +Y with up=+Z.

    This orients the kitty properly (feet down, face forward).
    Standard camera: looking -Z, up +Y
    We want: looking -Y, up +Z

    Rotation: 90 degrees around X axis.
    Quaternion for 90° rotation around X: (sin(45°), 0, 0, cos(45°)) = (0.7071, 0, 0, 0.7071)
    """
    import math
    angle = math.pi / 2  # 90 degrees
    half_angle = angle / 2
    return {
        "x": math.sin(half_angle),  # 0.7071
        "y": 0,
        "z": 0,
        "w": math.cos(half_angle),  # 0.7071
    }


def calculate_viewports(example: dict) -> dict | None:
    """Calculate optimal 2D and 3D viewports for an example dataset."""
    data = load_dataset(example["file"])
    if not data:
        return None

    kitties = data.get("kitties", [])
    if not kitties:
        print("  No kitties in dataset")
        return None

    # Run 2D simulation
    nodes, links = simulate_layout(kitties, iterations=150)

    # Calculate 2D bounding box and centroid
    xs = [n["x"] for n in nodes.values()]
    ys = [n["y"] for n in nodes.values()]

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    centroid_x = sum(xs) / len(xs)
    centroid_y = sum(ys) / len(ys)
    width = max_x - min_x
    height = max_y - min_y

    # Calculate optimal 2D zoom (assuming ~800x600 viewport)
    viewport_width, viewport_height = 800, 600
    padding = 1.2  # 20% padding
    zoom_x = viewport_width / (width * padding) if width > 0 else 1
    zoom_y = viewport_height / (height * padding) if height > 0 else 1
    zoom_2d = min(zoom_x, zoom_y, 2.0)  # Cap at 2.0
    zoom_2d = max(0.1, zoom_2d)  # Floor at 0.1

    # Calculate 3D positions
    z_axis_mode = example.get("zAxis", "generation")
    node_count = len(nodes)
    if node_count > 500:
        max_z_spread = 1000
    elif node_count < 50:
        max_z_spread = 600
    else:
        max_z_spread = 800

    positions_3d = []
    for k in kitties:
        node = nodes.get(int(k["id"]))
        if not node:
            continue
        z = calculate_z(k, kitties, z_axis_mode, max_z_spread)
        positions_3d.append({"x": node["x"], "y": node["y"], "z": z})

    if not positions_3d:
        return None

    centroid_3d_x = centroid_x
    centroid_3d_y = centroid_y
    centroid_3d_z = sum(p["z"] for p in positions_3d) / len(positions_3d)

    # Calculate 3D bounding sphere radius
    max_dist = 0
    for pos in positions_3d:
        dx = pos["x"] - centroid_3d_x
        dy = pos["y"] - centroid_3d_y
        dz = pos["z"] - centroid_3d_z
        dist = math.sqrt(dx * dx + dy * dy + dz * dz)
        max_dist = max(max_dist, dist)

    # Calculate optimal 3D camera position (from above, looking down at centroid)
    fov = 75 * math.pi / 180  # Default FOV
    camera_distance = (max_dist * 2.0) / math.tan(fov / 2) if max_dist > 0 else 500

    # Position camera directly above centroid (on +Y axis) looking down
    cam_x = centroid_3d_x
    cam_y = centroid_3d_y + camera_distance
    cam_z = centroid_3d_z

    # Get quaternion for looking down from +Y with up=+Z (proper kitty orientation)
    quat = calculate_quaternion_looking_down()

    z_values = [p["z"] for p in positions_3d]

    return {
        "node_count": len(nodes),
        "link_count": len(links),
        "cam2d": {
            "zoom": round(zoom_2d, 3),
            "x": round(centroid_x, 1),
            "y": round(centroid_y, 1),
        },
        "cam3d": {
            "x": round(cam_x, 1),
            "y": round(cam_y, 1),
            "z": round(cam_z, 1),
            "quatX": round(quat["x"], 4),
            "quatY": round(quat["y"], 4),
            "quatZ": round(quat["z"], 4),
            "quatW": round(quat["w"], 4),
            "zoom": 1,
        },
        "stats": {
            "width": round(width),
            "height": round(height),
            "z_range": round(max(z_values) - min(z_values)) if z_values else 0,
            "bounding_sphere_radius": round(max_dist),
        },
    }


def format_cam2d(cam: dict) -> str:
    """Format cam2d as URL parameter value (underscore-separated)."""
    return f"{cam['zoom']:.3f}_{cam['x']:.1f}_{cam['y']:.1f}"


def format_cam3d(cam: dict) -> str:
    """Format cam3d as URL parameter value (underscore-separated, quaternion format)."""
    return f"{cam['x']:.1f}_{cam['y']:.1f}_{cam['z']:.1f}_{cam['quatX']:.4f}_{cam['quatY']:.4f}_{cam['quatZ']:.4f}_{cam['quatW']:.4f}_{cam['zoom']:.2f}"


def main():
    print("Calculating optimal viewports for example datasets...\n")

    results = []

    for example in EXAMPLES:
        print(f"📊 {example['name']} ({example['file']})")
        viewport = calculate_viewports(example)

        if viewport:
            print(f"   Nodes: {viewport['node_count']}, Links: {viewport['link_count']}")
            print(f"   Bounds: {viewport['stats']['width']}x{viewport['stats']['height']}, Z-range: {viewport['stats']['z_range']}")
            print(f"   cam2d={format_cam2d(viewport['cam2d'])}")
            print(f"   cam3d={format_cam3d(viewport['cam3d'])}")
            results.append({**example, "viewport": viewport})
        print()

    # Output summary table
    print("\n=== Summary ===\n")
    print("Example                  | cam2d                    | cam3d")
    print("-------------------------|--------------------------|------------------------------------------")
    for r in results:
        name = r["name"].ljust(24)
        c2d = format_cam2d(r["viewport"]["cam2d"]).ljust(24)
        c3d = format_cam3d(r["viewport"]["cam3d"])
        print(f"{name} | {c2d} | {c3d}")

    print("\n\nNote: These are calculated estimates. Force-directed layouts are non-deterministic,")
    print("so actual viewport may need adjustment. Run the viewer and fine-tune as needed.")


if __name__ == "__main__":
    main()
